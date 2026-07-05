import { NextRequest, NextResponse } from "next/server";
import {
  PRODUCT_IMPORT_MODES,
  type ProductImportMode,
} from "@/features/products/product-import-constants";
import { parseImportFileBuffer } from "@/features/products/product-import-parser";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const importModeRaw = String(form.get("importMode") ?? "create-product");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Thiếu tệp upload." }, { status: 400 });
    }

    if (!PRODUCT_IMPORT_MODES.includes(importModeRaw as ProductImportMode)) {
      return NextResponse.json({ message: "Chế độ nhập không hợp lệ." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseImportFileBuffer(buffer, file.name, importModeRaw as ProductImportMode);

    return NextResponse.json({
      ok: true,
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      rows: parsed.rows,
      rawRows: parsed.rawRows,
      warnings: parsed.warnings,
      sheetSummary: parsed.sheets.map((s) => ({
        name: s.name,
        entityType: s.entityType,
        rowCount: s.rawRows.length,
      })),
      totalRows: parsed.rows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không đọc được tệp.";
    return NextResponse.json({ ok: false, message, error: message }, { status: 400 });
  }
}
