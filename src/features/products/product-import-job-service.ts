import type { ProductImportJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/storage";
import type { ProductImportOptions, ProductImportPreviewRow, ProductImportExecuteResult } from "@/features/products/product-import-types";
import {
  compactPreviewRows,
  expandCompactPreviewRows,
  generateProductImportFeedbackCsv,
  type CompactPreviewRow,
} from "@/features/products/product-import-feedback";

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
): Promise<void> {
  const compact = compactPreviewRows(rows);
  const errorCount = rows.filter((r) => r.finalAction === "invalid").length;
  const warningCount = rows.filter((r) => r.duplicateInfo && r.isValid).length;
  const status = resolvePreviewStatus(summary.valid, summary.invalid);

  let feedbackFileUrl: string | null = null;
  let feedbackFileKey: string | null = null;

  if (errorCount > 0 || warningCount > 0) {
    const csv = generateProductImportFeedbackCsv(rows);
    const job = await prisma.productImportJob.findUnique({ where: { id: jobId } });
    const stored = await storeImportFeedbackFile(csv, job?.fileName ?? "import.csv");
    feedbackFileUrl = stored.url;
    feedbackFileKey = stored.storageKey;
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
    const csv = generateProductImportFeedbackCsv(previewRows);
    const stored = await storeImportFeedbackFile(csv, job?.fileName ?? "import.csv");
    feedbackFileUrl = stored.url;
    feedbackFileKey = stored.storageKey;
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
