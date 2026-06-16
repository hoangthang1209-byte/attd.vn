import { NextRequest, NextResponse } from "next/server";
import { previewProductImport } from "@/features/products/product-import-service";
import type { ProductImportOptions, ProductImportRow } from "@/features/products/product-import-types";
import {
  createProductImportJob,
  storeImportOriginalFile,
  updateProductImportJobPreview,
  markImportJobFailed,
} from "@/features/products/product-import-job-service";

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

async function handlePreview(
  rows: ProductImportRow[],
  options: ProductImportOptions,
  fileMeta?: { buffer: Buffer; fileName: string; fileSize: number },
  existingJobId?: string,
) {
  const previewRows = await previewProductImport(rows, options);
  const summary = buildSummary(previewRows);

  let jobId = existingJobId;

  if (fileMeta) {
    const stored = await storeImportOriginalFile(fileMeta.buffer, fileMeta.fileName);
    if (!jobId) {
      jobId = await createProductImportJob({
        fileName: fileMeta.fileName,
        fileSize: fileMeta.fileSize,
        originalFileUrl: stored.url,
        originalFileKey: stored.storageKey,
      });
    } else {
      const { prisma } = await import("@/lib/prisma");
      await prisma.productImportJob.update({
        where: { id: jobId },
        data: {
          fileName: fileMeta.fileName,
          fileSize: fileMeta.fileSize,
          originalFileUrl: stored.url,
          originalFileKey: stored.storageKey,
        },
      });
    }
  } else if (!jobId) {
    jobId = await createProductImportJob({
      fileName: "import.json",
    });
  }

  await updateProductImportJobPreview(jobId, previewRows, options, summary);
  return { rows: previewRows, summary, jobId };
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const rowsRaw = form.get("rows");
      const optionsRaw = form.get("options");
      const existingJobId = typeof form.get("jobId") === "string" ? String(form.get("jobId")) : undefined;

      if (!rowsRaw || !optionsRaw) {
        return NextResponse.json({ message: "rows và options là bắt buộc." }, { status: 400 });
      }

      const rows = JSON.parse(String(rowsRaw)) as ProductImportRow[];
      const options = JSON.parse(String(optionsRaw)) as ProductImportOptions;

      let fileMeta: { buffer: Buffer; fileName: string; fileSize: number } | undefined;
      if (file instanceof File) {
        const buffer = Buffer.from(await file.arrayBuffer());
        fileMeta = { buffer, fileName: file.name, fileSize: file.size };
      }

      const result = await handlePreview(rows, options, fileMeta, existingJobId);
      return NextResponse.json(result);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }
    const raw = body as Record<string, unknown>;

    if (!Array.isArray(raw.rows)) {
      return NextResponse.json({ message: "rows là bắt buộc (array)." }, { status: 400 });
    }
    if (!raw.options) {
      return NextResponse.json({ message: "options là bắt buộc." }, { status: 400 });
    }

    const options = raw.options as ProductImportOptions;
    const fileName = typeof raw.fileName === "string" ? raw.fileName : "import.csv";
    const existingJobId = typeof raw.jobId === "string" ? raw.jobId : undefined;

    let jobId = existingJobId;
    if (!jobId) {
      jobId = await createProductImportJob({ fileName });
    }

    const previewRows = await previewProductImport(
      raw.rows as ProductImportRow[],
      options,
    );
    const summary = buildSummary(previewRows);
    await updateProductImportJobPreview(jobId, previewRows, options, summary);

    return NextResponse.json({ rows: previewRows, summary, jobId });
  } catch (err) {
    console.error("[POST /api/admin/products/import/preview]", err);
    const jobId = req.headers.get("x-import-job-id");
    if (jobId) {
      await markImportJobFailed(jobId, String(err)).catch(() => undefined);
    }
    return NextResponse.json({ message: "Lỗi preview import." }, { status: 500 });
  }
}
