import {
  CUSTOMIZATION_IMPORT_HEADERS,
  PRODUCT_IMPORT_HEADERS,
  SPEC_IMPORT_HEADERS,
  VARIANT_IMPORT_HEADERS,
} from "@/features/products/product-import-v2-templates";
import { IMPORT_SHEET_NAMES } from "@/features/products/product-import-constants";
import { parseStructuredOptionValues } from "@/features/products/product-import-options-parser";
import type { ProductExportValidationIssue } from "@/features/products/product-export.types";

const SHEET_HEADERS: Record<string, string[]> = {
  [IMPORT_SHEET_NAMES.product]: PRODUCT_IMPORT_HEADERS,
  [IMPORT_SHEET_NAMES.variant]: VARIANT_IMPORT_HEADERS,
  [IMPORT_SHEET_NAMES.specification]: SPEC_IMPORT_HEADERS,
  [IMPORT_SHEET_NAMES.customization]: CUSTOMIZATION_IMPORT_HEADERS,
};

function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

export function validateExportBundleCompatibility(
  sheets: Array<{ sheetName: string; headers: string[]; rows: Record<string, string>[] }>,
): ProductExportValidationIssue[] {
  const issues: ProductExportValidationIssue[] = [];

  for (const sheet of sheets) {
    const expected = SHEET_HEADERS[sheet.sheetName];
    if (!expected) continue;

    const headerSet = new Set(sheet.headers);
    for (const header of expected) {
      if (!headerSet.has(header)) {
        issues.push({
          sheet: sheet.sheetName,
          row: 0,
          field: header,
          message: `Thiếu cột bắt buộc "${header}".`,
        });
      }
    }

    const extra = sheet.headers.filter((h) => !expected.includes(h));
    for (const header of extra) {
      issues.push({
        sheet: sheet.sheetName,
        row: 0,
        field: header,
        message: `Cột không được import hỗ trợ: "${header}".`,
      });
    }

    sheet.rows.forEach((row, index) => {
      if (sheet.sheetName === IMPORT_SHEET_NAMES.variant) {
        const optionValues = row.optionValues?.trim() ?? "";
        const hasLegacy = Boolean(row.colorName?.trim() || row.sizeName?.trim());
        if (optionValues && hasLegacy) {
          issues.push({
            sheet: sheet.sheetName,
            row: index + 1,
            field: "optionValues",
            message: "Không được trộn optionValues và colorName/sizeName trong cùng dòng.",
          });
        }
        if (optionValues && !parseStructuredOptionValues(optionValues).length) {
          issues.push({
            sheet: sheet.sheetName,
            row: index + 1,
            field: "optionValues",
            message: "optionValues không phân tích được.",
          });
        }
      }

      if (sheet.sheetName === IMPORT_SHEET_NAMES.product) {
        const gallery = row.galleryUrls?.trim();
        if (gallery) {
          for (const url of gallery.split("|").map((u) => u.trim()).filter(Boolean)) {
            if (!isValidHttpUrl(url)) {
              issues.push({
                sheet: sheet.sheetName,
                row: index + 1,
                field: "galleryUrls",
                message: `URL gallery không hợp lệ: ${url}`,
              });
            }
          }
        }
        const featured = row.featuredImageUrl?.trim();
        if (featured && !isValidHttpUrl(featured)) {
          issues.push({
            sheet: sheet.sheetName,
            row: index + 1,
            field: "featuredImageUrl",
            message: "URL ảnh đại diện không hợp lệ.",
          });
        }
      }

      for (const [field, raw] of Object.entries(row)) {
        if (String(raw ?? "") === "__CLEAR__") {
          issues.push({
            sheet: sheet.sheetName,
            row: index + 1,
            field,
            message: "Export không được chứa __CLEAR__.",
          });
        }
      }
    });
  }

  return issues;
}

export function runExportCompatibilitySelfTest(): ProductExportValidationIssue[] {
  const sheets = [
    {
      sheetName: IMPORT_SHEET_NAMES.product,
      headers: PRODUCT_IMPORT_HEADERS,
      rows: [
        {
          productCode: "TS0001",
          systemCode: "P-00001",
          name: "Áo thun =test",
          slug: "ao-thun-test",
          categorySlug: "ao-thun-tron",
          shortDescription: "Mô tả ngắn",
          description: "Mô tả dài",
          material: "CVC",
          form: "Regular",
          fit: "Unisex",
          gsm: "180",
          defaultMoq: "50",
          leadTime: "7 ngày",
          supportsPrinting: "true",
          supportsEmbroidery: "false",
          supportsOem: "true",
          tags: "áo thun,sỉ",
          featuredImageUrl: "https://example.com/a.jpg",
          galleryUrls: "https://example.com/a.jpg|https://example.com/b.jpg",
          status: "ACTIVE",
          seoTitle: "",
          seoDescription: "",
        },
      ],
    },
    {
      sheetName: IMPORT_SHEET_NAMES.variant,
      headers: VARIANT_IMPORT_HEADERS,
      rows: [
        {
          productCode: "TS0001",
          sku: "TS0001-BLK-M",
          displayLabel: "Đen / M",
          optionValues: "Màu sắc=Đen | Kích thước=M",
          colorName: "",
          colorCode: "",
          sizeName: "",
          materialOverride: "",
          stockQty: "100",
          stockStatus: "IN_STOCK",
          moqOverride: "",
          leadTimeOverride: "",
          imageUrl: "",
          variantStatus: "INACTIVE",
          wholesalePrice: "",
          dealerPrice: "",
        },
        {
          productCode: "TS0002",
          sku: "TS0002-WHT-L",
          displayLabel: "Trắng / L",
          optionValues: "",
          colorName: "Trắng",
          colorCode: "WHT",
          sizeName: "L",
          materialOverride: "",
          stockQty: "50",
          stockStatus: "IN_STOCK",
          moqOverride: "",
          leadTimeOverride: "",
          imageUrl: "",
          variantStatus: "ACTIVE",
          wholesalePrice: "",
          dealerPrice: "",
        },
      ],
    },
    {
      sheetName: IMPORT_SHEET_NAMES.specification,
      headers: SPEC_IMPORT_HEADERS,
      rows: [{ productCode: "TS0001", group: "", label: "GSM", value: "180", sortOrder: "1" }],
    },
    {
      sheetName: IMPORT_SHEET_NAMES.customization,
      headers: CUSTOMIZATION_IMPORT_HEADERS,
      rows: [
        {
          productCode: "TS0001",
          capability: "In lụa",
          description: "Logo 1-4 màu",
          sortOrder: "1",
          enabled: "true",
        },
      ],
    },
  ];

  return validateExportBundleCompatibility(sheets);
}
