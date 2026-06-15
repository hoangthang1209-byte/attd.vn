import { NextRequest, NextResponse } from "next/server";
import { getProductImportTemplate, PRODUCT_IMPORT_TEMPLATES } from "@/features/products/product-import-templates";
import {
  createCsvTemplate,
  downloadXlsxResponse,
} from "@/features/import/import-template-utils";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const templateId = sp.get("type");
  const format = sp.get("format") ?? "csv";

  // List available templates
  if (!templateId) {
    return NextResponse.json(
      PRODUCT_IMPORT_TEMPLATES.map((t) => ({ id: t.id, label: t.label, fileName: t.fileName }))
    );
  }

  const template = getProductImportTemplate(templateId);
  if (!template) {
    return NextResponse.json({ message: `Template "${templateId}" không tồn tại.` }, { status: 404 });
  }

  if (format === "xlsx") {
    return downloadXlsxResponse(template.fileName, template.headers, template.sampleRows);
  }

  const csv = createCsvTemplate(template.headers, template.sampleRows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${template.fileName}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
