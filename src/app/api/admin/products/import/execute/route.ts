import { NextRequest, NextResponse } from "next/server";
import { executeProductImport } from "@/features/products/product-import-service";
import { executeProductImportV2 } from "@/features/products/product-import-v2.service";
import type { ProductImportOptions, ProductImportPreviewRow } from "@/features/products/product-import-types";
import { prisma } from "@/lib/prisma";
import {
  createProductImportJob,
  markImportJobFailed,
} from "@/features/products/product-import-job-service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "admin",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  if (!Array.isArray(raw.rows) || !raw.options) {
    return NextResponse.json({ message: "rows và options là bắt buộc." }, { status: 400 });
  }

  const fileName = typeof raw.fileName === "string" ? raw.fileName : "import.csv";
  const options = raw.options as ProductImportOptions;
  const rows = raw.rows as ProductImportPreviewRow[];
  const jobIdFromPreview = typeof raw.jobId === "string" ? raw.jobId : undefined;

  let jobId = jobIdFromPreview;

  if (jobId) {
    const existing = await prisma.productImportJob.findUnique({ where: { id: jobId } });
    if (!existing) {
      return NextResponse.json({ message: "Import job không tồn tại." }, { status: 404 });
    }
    await prisma.productImportJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", totalRows: rows.length },
    });
  } else {
    jobId = await createProductImportJob({ fileName });
    await prisma.productImportJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", totalRows: rows.length },
    });
  }

  try {
    const result = options.importMode
      ? await executeProductImportV2(rows, options, jobId)
      : await executeProductImport(rows, options, jobId);
    return NextResponse.json({
      ok: true,
      jobId,
      message: `Tạo ${result.createdProducts} sản phẩm, cập nhật ${result.updatedProducts}, ${result.createdVariants} biến thể mới — bỏ qua ${result.skippedRows}, lỗi ${result.invalidRows + (result.failedRows ?? 0)}.`,
      ...result,
    });
  } catch (err) {
    await markImportJobFailed(jobId, String(err));
    console.error("[POST /api/admin/products/import/execute]", err);
    return NextResponse.json({ message: "Import thất bại." }, { status: 500 });
  }
}
