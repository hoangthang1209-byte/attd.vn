import { NextRequest, NextResponse } from "next/server";
import { previewProductImport } from "@/features/products/product-import-service";
import type { ProductImportOptions, ProductImportRow } from "@/features/products/product-import-types";
import {
  createProductImportJob,
  tryStoreImportOriginalFile,
  updateProductImportJobPreview,
  isPrismaSchemaMismatchError,
  prismaErrorDetail,
} from "@/features/products/product-import-job-service";
import { prisma } from "@/lib/prisma";

function buildSummary(rows: Awaited<ReturnType<typeof previewProductImport>>) {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.isValid).length,
    invalid: rows.filter((r) => r.finalAction === "invalid").length,
    duplicates: rows.filter((r) => r.duplicateInfo !== null).length,
    newProducts: rows.filter((r) => r.finalAction === "create").length,
    newVariants: rows.filter((r) => r.finalAction === "create" && (r.colorName || r.sizeName)).length,
  };
}

function errorResponse(
  error: string,
  detail: string,
  code: string,
  status = 500,
) {
  return NextResponse.json({ ok: false, error, detail, code, message: error }, { status });
}

function logPreviewError(code: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[POST /api/admin/products/import/preview] code=${code} message=${message}`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
}

type ParsedPreviewInput = {
  rows: ProductImportRow[];
  rawRows?: Record<string, unknown>[];
  options: ProductImportOptions;
  fileName: string;
  fileMeta?: { buffer: Buffer; fileName: string; fileSize: number };
  existingJobId?: string;
};

function parseJsonPayload(raw: Record<string, unknown>): ParsedPreviewInput | NextResponse {
  if (!Array.isArray(raw.rows)) {
    return errorResponse(
      "Thiếu dữ liệu hàng import.",
      "rows phải là array.",
      "IMPORT_PREVIEW_PARSE_FAILED",
      400,
    );
  }
  if (!raw.options || typeof raw.options !== "object") {
    return errorResponse(
      "Thiếu cấu hình import.",
      "options là bắt buộc.",
      "IMPORT_PREVIEW_PARSE_FAILED",
      400,
    );
  }

  return {
    rows: raw.rows as ProductImportRow[],
    rawRows: Array.isArray(raw.rawRows) ? (raw.rawRows as Record<string, unknown>[]) : undefined,
    options: raw.options as ProductImportOptions,
    fileName: typeof raw.fileName === "string" ? raw.fileName : "import.csv",
    existingJobId: typeof raw.jobId === "string" ? raw.jobId : undefined,
  };
}

async function parseFormPayload(form: FormData): Promise<ParsedPreviewInput | NextResponse> {
  const rowsRaw = form.get("rows");
  const optionsRaw = form.get("options");

  if (!rowsRaw || !optionsRaw) {
    return errorResponse(
      "Thiếu dữ liệu preview.",
      "FormData cần rows và options (JSON string).",
      "IMPORT_PREVIEW_PARSE_FAILED",
      400,
    );
  }

  let rows: ProductImportRow[];
  let options: ProductImportOptions;
  try {
    rows = JSON.parse(String(rowsRaw)) as ProductImportRow[];
    options = JSON.parse(String(optionsRaw)) as ProductImportOptions;
  } catch (err) {
    return errorResponse(
      "Không đọc được dữ liệu preview.",
      prismaErrorDetail(err),
      "IMPORT_PREVIEW_PARSE_FAILED",
      400,
    );
  }

  if (!Array.isArray(rows)) {
    return errorResponse(
      "Dữ liệu hàng không hợp lệ.",
      "rows phải là array.",
      "IMPORT_PREVIEW_PARSE_FAILED",
      400,
    );
  }

  const file = form.get("file");
  let fileMeta: ParsedPreviewInput["fileMeta"];
  let fileName = typeof form.get("fileName") === "string" ? String(form.get("fileName")) : "import.csv";

  if (file instanceof File) {
    fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    fileMeta = { buffer, fileName: file.name, fileSize: file.size };
  }

  let rawRows: Record<string, unknown>[] | undefined;
  const rawRowsField = form.get("rawRows");
  if (rawRowsField) {
    try {
      const parsed = JSON.parse(String(rawRowsField));
      if (Array.isArray(parsed)) rawRows = parsed as Record<string, unknown>[];
    } catch {
      // optional
    }
  }

  return {
    rows,
    rawRows,
    options,
    fileName,
    fileMeta,
    existingJobId: typeof form.get("jobId") === "string" ? String(form.get("jobId")) : undefined,
  };
}

async function runPreview(input: ParsedPreviewInput) {
  const warnings: string[] = [];

  const previewRows = await previewProductImport(input.rows, input.options, input.rawRows);
  const summary = buildSummary(previewRows);

  let jobId = input.existingJobId;

  if (!jobId) {
    try {
      jobId = await createProductImportJob({ fileName: input.fileName });
    } catch (err) {
      if (isPrismaSchemaMismatchError(err)) {
        logPreviewError("IMPORT_JOB_SCHEMA_MISMATCH", err);
        return {
          ok: true as const,
          rows: previewRows,
          summary,
          warnings: [
            "Không thể tạo lịch sử import. Kiểm tra migration production.",
          ],
        };
      }
      throw err;
    }
  }

  if (input.fileMeta) {
    const stored = await tryStoreImportOriginalFile(input.fileMeta.buffer, input.fileMeta.fileName);
    if (stored) {
      try {
        await prisma.productImportJob.update({
          where: { id: jobId },
          data: {
            fileName: input.fileMeta.fileName,
            fileSize: input.fileMeta.fileSize,
            originalFileUrl: stored.url,
            originalFileKey: stored.storageKey,
            status: "UPLOADED",
          },
        });
      } catch (err) {
        if (isPrismaSchemaMismatchError(err)) {
          warnings.push("Không thể tạo lịch sử import. Kiểm tra migration production.");
        } else {
          warnings.push("Không lưu được file gốc, nhưng vẫn có thể xem trước.");
          logPreviewError("IMPORT_ORIGINAL_FILE_DB_UPDATE_FAILED", err);
        }
      }
    } else {
      warnings.push("Không lưu được file gốc, nhưng vẫn có thể xem trước.");
    }
  }

  let feedbackDownloadUrl: string | null = null;
  try {
    const jobUpdate = await updateProductImportJobPreview(jobId, previewRows, input.options, summary);
    warnings.push(...jobUpdate.warnings);
    feedbackDownloadUrl = jobUpdate.feedbackDownloadUrl;
  } catch (err) {
    if (isPrismaSchemaMismatchError(err)) {
      warnings.push("Không thể tạo lịch sử import. Kiểm tra migration production.");
      logPreviewError("IMPORT_JOB_SCHEMA_MISMATCH", err);
    } else {
      warnings.push("Không lưu được kết quả preview vào lịch sử, nhưng vẫn xem trước được.");
      logPreviewError("IMPORT_JOB_PREVIEW_UPDATE_FAILED", err);
    }
  }

  if (!feedbackDownloadUrl && jobId && (summary.invalid > 0 || previewRows.some((r) => r.duplicateInfo && r.isValid))) {
    feedbackDownloadUrl = `/api/admin/products/import/jobs/${jobId}/download-feedback`;
  }

  return {
    ok: true as const,
    rows: previewRows,
    summary,
    jobId,
    warnings: warnings.length > 0 ? warnings : undefined,
    feedbackDownloadUrl: feedbackDownloadUrl ?? undefined,
    feedbackCsvDownloadUrl: jobId && feedbackDownloadUrl
      ? `/api/admin/products/import/jobs/${jobId}/download-feedback?format=csv`
      : undefined,
    totalRows: summary.total,
    validRows: summary.valid,
    invalidRows: summary.invalid,
  };
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  try {
    let parsed: ParsedPreviewInput | NextResponse;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      parsed = await parseFormPayload(form);
    } else {
      let body: unknown;
      try {
        body = await req.json();
      } catch (err) {
        return errorResponse(
          "Không đọc được JSON preview.",
          prismaErrorDetail(err),
          "IMPORT_PREVIEW_PARSE_FAILED",
          400,
        );
      }
      parsed = parseJsonPayload(body as Record<string, unknown>);
    }

    if (parsed instanceof NextResponse) return parsed;

    const result = await runPreview(parsed);
    return NextResponse.json(result);
  } catch (err) {
    logPreviewError("IMPORT_PREVIEW_FAILED", err);
    return errorResponse(
      "Không thể xem trước file import.",
      prismaErrorDetail(err),
      "IMPORT_PREVIEW_FAILED",
      500,
    );
  }
}
