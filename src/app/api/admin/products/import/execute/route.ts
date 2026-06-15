import { NextRequest, NextResponse } from "next/server";
import { executeProductImport } from "@/features/products/product-import-service";
import type { ProductImportOptions, ProductImportPreviewRow } from "@/features/products/product-import-types";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;

  if (!Array.isArray(raw.rows) || !raw.options) {
    return NextResponse.json({ message: "rows và options là bắt buộc." }, { status: 400 });
  }

  const fileName = typeof raw.fileName === "string" ? raw.fileName : "import.csv";
  const options = raw.options as ProductImportOptions;
  const rows = raw.rows as ProductImportPreviewRow[];

  const job = await prisma.productImportJob.create({
    data: { fileName, totalRows: rows.length, status: "PROCESSING" },
  });

  try {
    const result = await executeProductImport(rows, options, job.id);
    return NextResponse.json({
      ok: true,
      jobId: job.id,
      message: `Tạo ${result.createdProducts} sản phẩm, ${result.createdVariants} SKU — bỏ qua ${result.skippedRows}, lỗi ${result.invalidRows}.`,
      ...result,
    });
  } catch (err) {
    await prisma.productImportJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errors: [String(err)] },
    });
    console.error("[POST /api/admin/products/import/execute]", err);
    return NextResponse.json({ message: "Import thất bại." }, { status: 500 });
  }
}
