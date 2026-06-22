import { NextRequest, NextResponse } from "next/server";
import { getProductImportTemplate, PRODUCT_IMPORT_TEMPLATES } from "@/features/products/product-import-templates";
import {
  CATALOG_BUNDLE_TEMPLATE_ID,
  getCatalogBundleSheets,
  getProductImportV2Template,
  PRODUCT_IMPORT_V2_TEMPLATES,
} from "@/features/products/product-import-v2-templates";
import {
  createCsvTemplate,
  downloadMultiSheetXlsxResponse,
  downloadXlsxResponse,
} from "@/features/import/import-template-utils";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";

export async function GET(req: NextRequest) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const sp = req.nextUrl.searchParams;
  const templateId = sp.get("type");
  const format = sp.get("format") ?? "csv";

  if (!templateId) {
    return NextResponse.json([
      ...PRODUCT_IMPORT_V2_TEMPLATES.map((t) => ({
        id: t.id,
        label: t.label,
        fileName: t.fileName,
        group: "v2",
      })),
      {
        id: CATALOG_BUNDLE_TEMPLATE_ID,
        label: "Bộ mẫu catalog đầy đủ (workbook)",
        fileName: "attd-import-catalog-bundle",
        group: "v2",
      },
      ...PRODUCT_IMPORT_TEMPLATES.map((t) => ({
        id: t.id,
        label: t.label,
        fileName: t.fileName,
        group: "legacy",
      })),
    ]);
  }

  if (templateId === CATALOG_BUNDLE_TEMPLATE_ID) {
    if (format === "xlsx") {
      const sheets = getCatalogBundleSheets();
      return downloadMultiSheetXlsxResponse(
        "attd-import-catalog-bundle",
        sheets.map((s) => ({ sheetName: s.sheetName, headers: s.headers, rows: s.sampleRows })),
      );
    }
    const productTemplate = getProductImportV2Template("catalog-product");
    if (!productTemplate) {
      return NextResponse.json({ message: "Template không tồn tại." }, { status: 404 });
    }
    const csv = createCsvTemplate(productTemplate.headers, productTemplate.sampleRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${productTemplate.fileName}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const v2Template = getProductImportV2Template(templateId);
  const template = v2Template ?? getProductImportTemplate(templateId);
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
