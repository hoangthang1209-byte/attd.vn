import type { ProductImportJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/storage";
import type { ProductImportOptions, ProductImportPreviewRow, ProductImportExecuteResult } from "@/features/products/product-import-types";
import {
  compactPreviewRows,
  expandCompactPreviewRows,
  generateProductImportFeedbackCsv,
  collectRowFeedbackIssues,
  type CompactPreviewRow,
  type FeedbackJobMeta,
} from "@/features/products/product-import-feedback";
import { generateProductImportFeedbackExcel } from "@/features/products/product-import-feedback-excel";

export type ProductImportJobSummary = {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedBy: string | null;
  preset: string | null;
  duplicateStrategy: string | null;
  status: ProductImportJobStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants: number;
  skippedRows: number;
  duplicateRows: number;
  createdCategories: number;
  errorCount: number;
  warningCount: number;
  originalFileUrl: string | null;
  feedbackFileUrl: string | null;
  hasOriginalFile: boolean;
  hasFeedbackFile: boolean;
  createdAt: Date;
  updatedAt: Date;
  summaryJson: unknown;
  errorsJson: unknown;
};

function inferFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "json") return "json";
  return "csv";
}

function contentTypeForFileType(fileType: string): string {
  if (fileType === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (fileType === "json") return "application/json";
  return "text/csv";
}

export async function storeImportOriginalFile(
  buffer: Buffer,
  fileName: string,
): Promise<{ url: string; storageKey: string }> {
  const adapter = getStorageAdapter();
  const fileType = inferFileType(fileName);
  const result = await adapter.upload(
    "general",
    `import-original-${Date.now()}-${fileName}`,
    buffer,
    contentTypeForFileType(fileType),
  );
  return { url: result.url, storageKey: result.storageKey };
}

export async function tryStoreImportOriginalFile(
  buffer: Buffer,
  fileName: string,
): Promise<{ url: string; storageKey: string } | null> {
  try {
    return await storeImportOriginalFile(buffer, fileName);
  } catch (err) {
    console.error("[product-import] storeImportOriginalFile failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function storeImportFeedbackBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ url: string; storageKey: string }> {
  const adapter = getStorageAdapter();
  const result = await adapter.upload(
    "general",
    `import-feedback-${Date.now()}-${fileName}`,
    buffer,
    contentType,
  );
  return { url: result.url, storageKey: result.storageKey };
}

export async function tryStoreImportFeedbackBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ url: string; storageKey: string } | null> {
  try {
    return await storeImportFeedbackBuffer(buffer, fileName, contentType);
  } catch (err) {
    console.error("[product-import] storeImportFeedbackBuffer failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function storeImportFeedbackFile(
  csvContent: string,
  fileName: string,
): Promise<{ url: string; storageKey: string }> {
  const adapter = getStorageAdapter();
  const safeName = fileName.replace(/\.[^.]+$/, "") + "-feedback.csv";
  const result = await adapter.upload(
    "general",
    `import-feedback-${Date.now()}-${safeName}`,
    Buffer.from(csvContent, "utf-8"),
    "text/csv",
  );
  return { url: result.url, storageKey: result.storageKey };
}

export async function tryStoreImportFeedbackFile(
  csvContent: string,
  fileName: string,
): Promise<{ url: string; storageKey: string } | null> {
  try {
    return await storeImportFeedbackFile(csvContent, fileName);
  } catch (err) {
    console.error("[product-import] storeImportFeedbackFile failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function isPrismaSchemaMismatchError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "P2022" ||
    e.code === "P2010" ||
    (typeof e.message === "string" &&
      (e.message.includes("column") ||
        e.message.includes("Unknown argument") ||
        e.message.includes("does not exist")))
  );
}

export function prismaErrorDetail(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function resolvePreviewStatus(
  valid: number,
  invalid: number,
): ProductImportJobStatus {
  if (invalid === 0 && valid > 0) return "VALIDATED";
  if (valid > 0) return "PREVIEWED";
  return "FAILED";
}

export function resolveExecuteStatus(result: ProductImportExecuteResult): ProductImportJobStatus {
  const created = result.createdProducts + result.createdVariants;
  const hasErrors = result.invalidRows > 0 || result.errors.length > 0;
  if (created === 0 && hasErrors) return "FAILED";
  if (hasErrors || result.skippedRows > 0) return "PARTIAL";
  return "COMPLETED";
}

export async function createProductImportJob(params: {
  fileName: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string | null;
  originalFileUrl?: string | null;
  originalFileKey?: string | null;
}): Promise<string> {
  const job = await prisma.productImportJob.create({
    data: {
      fileName: params.fileName,
      fileType: params.fileType ?? inferFileType(params.fileName),
      fileSize: params.fileSize,
      uploadedBy: params.uploadedBy ?? null,
      originalFileUrl: params.originalFileUrl ?? null,
      originalFileKey: params.originalFileKey ?? null,
      status: params.originalFileUrl ? "UPLOADED" : "PENDING",
    },
  });
  return job.id;
}

export async function updateProductImportJobPreview(
  jobId: string,
  rows: ProductImportPreviewRow[],
  options: ProductImportOptions,
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    newProducts: number;
    newVariants: number;
  },
): Promise<{ feedbackDownloadUrl: string | null; feedbackCsvDownloadUrl: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const compact = compactPreviewRows(rows);
  const errorCount = rows.filter((r) => r.finalAction === "invalid").length;
  const warningCount = rows.filter((r) => r.duplicateInfo && r.isValid).length;
  const status = resolvePreviewStatus(summary.valid, summary.invalid);

  let feedbackFileUrl: string | null = null;
  let feedbackFileKey: string | null = null;

  if (errorCount > 0 || warningCount > 0) {
    const job = await prisma.productImportJob.findUnique({ where: { id: jobId } });
    const meta: FeedbackJobMeta = {
      fileName: job?.fileName ?? "import.csv",
      uploadedAt: job?.createdAt ?? new Date(),
      preset: options.presetId ?? job?.preset,
      status: status,
      totalRows: summary.total,
      validRows: summary.valid,
      invalidRows: summary.invalid,
      errorCount,
      warningCount,
    };

    try {
      const excelBuffer = await generateProductImportFeedbackExcel(rows, meta);
      const excelName = (job?.fileName ?? "import.csv").replace(/\.[^.]+$/, "") + "-feedback.xlsx";
      const stored = await tryStoreImportFeedbackBuffer(
        excelBuffer,
        excelName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      if (stored) {
        feedbackFileUrl = stored.url;
        feedbackFileKey = stored.storageKey;
      } else {
        const csv = generateProductImportFeedbackCsv(rows);
        const csvStored = await tryStoreImportFeedbackFile(csv, job?.fileName ?? "import.csv");
        if (csvStored) {
          feedbackFileUrl = csvStored.url;
          feedbackFileKey = csvStored.storageKey;
        } else {
          warnings.push("Không lưu được file feedback lên storage, vẫn có thể tải qua API.");
        }
      }
    } catch (err) {
      console.error("[product-import] generateProductImportFeedbackExcel failed:", err instanceof Error ? err.message : err);
      const csv = generateProductImportFeedbackCsv(rows);
      const csvStored = await tryStoreImportFeedbackFile(csv, job?.fileName ?? "import.csv");
      if (csvStored) {
        feedbackFileUrl = csvStored.url;
        feedbackFileKey = csvStored.storageKey;
        warnings.push("Không tạo được file Excel, đã lưu CSV fallback.");
      } else {
        warnings.push("Không lưu được file feedback lên storage, vẫn có thể tải qua API.");
      }
    }
  }

  await prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status,
      totalRows: summary.total,
      validRows: summary.valid,
      invalidRows: summary.invalid,
      duplicateRows: summary.duplicates,
      errorCount,
      warningCount,
      preset: options.presetId ?? null,
      duplicateStrategy: options.defaultDuplicateStrategy,
      summaryJson: summary,
      errorsJson: rows
        .filter((r) => r.validationErrors.length > 0)
        .map((r) => ({
          row: r.rowIndex + 1,
          errors: r.validationErrors,
          productName: r.productName,
        })),
      warningsJson: rows
        .filter((r) => r.duplicateInfo && r.isValid)
        .map((r) => ({
          row: r.rowIndex + 1,
          duplicate: r.duplicateInfo,
          productName: r.productName,
        })),
      feedbackFileUrl,
      feedbackFileKey,
      metadata: {
        options,
        previewRows: compact,
      },
    },
  });

  const feedbackDownloadUrl =
    errorCount > 0 || warningCount > 0
      ? `/api/admin/products/import/jobs/${jobId}/download-feedback`
      : null;

  const feedbackCsvDownloadUrl =
    errorCount > 0 || warningCount > 0
      ? `/api/admin/products/import/jobs/${jobId}/download-feedback?format=csv`
      : null;

  return {
    feedbackDownloadUrl,
    feedbackCsvDownloadUrl,
    warnings,
  };
}

export async function updateProductImportJobExecute(
  jobId: string,
  result: ProductImportExecuteResult,
): Promise<ProductImportJobStatus> {
  const job = await getProductImportJob(jobId);
  const previewRows = job ? getPreviewRowsFromJob(job) : null;
  const status = resolveExecuteStatus(result);

  let feedbackFileUrl: string | undefined;
  let feedbackFileKey: string | undefined;

  if (previewRows && (result.invalidRows > 0 || result.errors.length > 0 || result.skippedRows > 0)) {
    const meta: FeedbackJobMeta = {
      fileName: job?.fileName ?? "import.csv",
      uploadedAt: job?.createdAt ?? new Date(),
      preset: job?.preset,
      status: status,
      totalRows: job?.totalRows ?? previewRows.length,
      validRows: job?.validRows ?? 0,
      invalidRows: result.invalidRows,
      errorCount: result.invalidRows + result.errors.length,
      warningCount: job?.warningCount ?? 0,
    };
    try {
      const excelBuffer = await generateProductImportFeedbackExcel(previewRows, meta);
      const excelName = (job?.fileName ?? "import.csv").replace(/\.[^.]+$/, "") + "-feedback.xlsx";
      const stored = await tryStoreImportFeedbackBuffer(
        excelBuffer,
        excelName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      if (stored) {
        feedbackFileUrl = stored.url;
        feedbackFileKey = stored.storageKey;
      } else {
        const csv = generateProductImportFeedbackCsv(previewRows);
        const csvStored = await tryStoreImportFeedbackFile(csv, job?.fileName ?? "import.csv");
        if (csvStored) {
          feedbackFileUrl = csvStored.url;
          feedbackFileKey = csvStored.storageKey;
        }
      }
    } catch {
      const csv = generateProductImportFeedbackCsv(previewRows);
      const csvStored = await tryStoreImportFeedbackFile(csv, job?.fileName ?? "import.csv");
      if (csvStored) {
        feedbackFileUrl = csvStored.url;
        feedbackFileKey = csvStored.storageKey;
      }
    }
  }

  await prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status,
      createdProducts: result.createdProducts,
      updatedProducts: result.updatedProducts,
      createdVariants: result.createdVariants,
      updatedVariants: result.updatedVariants,
      skippedRows: result.skippedRows,
      invalidRows: result.invalidRows,
      duplicateRows: result.duplicateRows,
      createdCategories: result.createdCategories,
      errorCount: result.invalidRows + result.errors.length,
      errors: result.errors,
      ...(feedbackFileUrl
        ? { feedbackFileUrl, feedbackFileKey }
        : {}),
    },
  });

  return status;
}

export async function listProductImportJobs(limit = 50): Promise<ProductImportJobSummary[]> {
  const jobs = await prisma.productImportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return jobs.map((j) => ({
    id: j.id,
    fileName: j.fileName,
    fileType: j.fileType,
    fileSize: j.fileSize,
    uploadedBy: j.uploadedBy,
    preset: j.preset,
    duplicateStrategy: j.duplicateStrategy,
    status: j.status,
    totalRows: j.totalRows,
    validRows: j.validRows,
    invalidRows: j.invalidRows,
    createdProducts: j.createdProducts,
    updatedProducts: j.updatedProducts,
    createdVariants: j.createdVariants,
    updatedVariants: j.updatedVariants,
    skippedRows: j.skippedRows,
    duplicateRows: j.duplicateRows,
    createdCategories: j.createdCategories,
    errorCount: j.errorCount,
    warningCount: j.warningCount,
    originalFileUrl: j.originalFileUrl,
    feedbackFileUrl: j.feedbackFileUrl,
    hasOriginalFile: Boolean(j.originalFileUrl),
    hasFeedbackFile: Boolean(j.feedbackFileUrl),
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    summaryJson: j.summaryJson,
    errorsJson: j.errorsJson,
  }));
}

export async function getProductImportJob(id: string) {
  return prisma.productImportJob.findUnique({ where: { id } });
}

export function getPreviewRowsFromJob(job: {
  metadata: unknown;
}): ProductImportPreviewRow[] | null {
  if (!job.metadata || typeof job.metadata !== "object") return null;
  const meta = job.metadata as { previewRows?: CompactPreviewRow[] };
  if (!Array.isArray(meta.previewRows)) return null;
  return expandCompactPreviewRows(meta.previewRows);
}

export async function getFeedbackExcelForJob(jobId: string): Promise<Buffer | null> {
  const job = await getProductImportJob(jobId);
  if (!job) return null;

  const rows = getPreviewRowsFromJob(job);
  if (!rows || rows.length === 0) return null;

  const errorCount = rows.filter((r) => r.finalAction === "invalid").length;
  const warningCount = rows.filter((r) => collectRowFeedbackIssues(r).some((i) => i.severity === "warning")).length;

  const meta: FeedbackJobMeta = {
    fileName: job.fileName,
    uploadedAt: job.createdAt,
    preset: job.preset,
    status: job.status,
    totalRows: job.totalRows,
    validRows: job.validRows,
    invalidRows: job.invalidRows,
    errorCount: job.errorCount || errorCount,
    warningCount: job.warningCount || warningCount,
  };

  try {
    return await generateProductImportFeedbackExcel(rows, meta);
  } catch (err) {
    console.error("[product-import] getFeedbackExcelForJob failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getFeedbackCsvForJob(jobId: string): Promise<string | null> {
  const job = await getProductImportJob(jobId);
  if (!job) return null;

  const rows = getPreviewRowsFromJob(job);
  if (rows && rows.length > 0) {
    return generateProductImportFeedbackCsv(rows);
  }
  return null;
}

export async function markImportJobFailed(jobId: string, message: string): Promise<void> {
  await prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      errors: [message],
    },
  });
}

export async function deleteProductImportJob(id: string): Promise<boolean> {
  const job = await getProductImportJob(id);
  if (!job) return false;

  const adapter = getStorageAdapter();
  if (job.originalFileUrl && job.originalFileKey) {
    await adapter.delete(job.originalFileUrl, job.originalFileKey).catch(() => undefined);
  }
  if (job.feedbackFileUrl && job.feedbackFileKey) {
    await adapter.delete(job.feedbackFileUrl, job.feedbackFileKey).catch(() => undefined);
  }

  await prisma.productImportJob.delete({ where: { id } });
  return true;
}
