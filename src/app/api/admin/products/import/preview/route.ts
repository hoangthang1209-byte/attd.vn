import { NextRequest, NextResponse } from "next/server";
import { previewProductImport } from "@/features/products/product-import-service";
import type { ProductImportOptions } from "@/features/products/product-import-types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;

  if (!Array.isArray(raw.rows)) {
    return NextResponse.json({ message: "rows là bắt buộc (array)." }, { status: 400 });
  }
  if (!raw.options) {
    return NextResponse.json({ message: "options là bắt buộc." }, { status: 400 });
  }

  const options = raw.options as ProductImportOptions;
  try {
    const rows = await previewProductImport(
      raw.rows as Parameters<typeof previewProductImport>[0],
      options
    );
    const summary = {
      total: rows.length,
      valid: rows.filter((r) => r.isValid).length,
      invalid: rows.filter((r) => r.finalAction === "invalid").length,
      duplicates: rows.filter((r) => r.duplicateInfo !== null).length,
      newProducts: rows.filter((r) => r.finalAction === "create").length,
      newVariants: rows.filter((r) => r.finalAction === "create" && (r.colorName || r.sizeName)).length,
    };
    return NextResponse.json({ rows, summary });
  } catch (err) {
    console.error("[POST /api/admin/products/import/preview]", err);
    return NextResponse.json({ message: "Lỗi preview import." }, { status: 500 });
  }
}
