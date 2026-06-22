import {
  IMPORT_FILE_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_SHEET_NAMES,
  type ProductImportEntityType,
} from "@/features/products/product-import-constants";
import type { ProductImportRow } from "@/features/products/product-import-types";
import type { ProductImportMode } from "@/features/products/product-import-constants";
import { mapRawRowToImportRow } from "@/features/products/product-import-utils";
import type { ProductImportColumnMapping } from "@/features/products/product-import-types";

export type ParsedImportFile = {
  fileName: string;
  fileType: "csv" | "xlsx";
  sheets: Array<{
    name: string;
    entityType: ProductImportEntityType | "guide" | "unknown";
    headers: string[];
    rawRows: Record<string, unknown>[];
  }>;
  rows: ProductImportRow[];
  rawRows: Record<string, unknown>[];
  warnings: string[];
};

const ENTITY_SHEET_ALIASES: Record<string, ProductImportEntityType | "guide"> = {
  [IMPORT_SHEET_NAMES.guide.toLowerCase()]: "guide",
  huongdan: "guide",
  guide: "guide",
  [IMPORT_SHEET_NAMES.product.toLowerCase()]: "product",
  sanpham: "product",
  product: "product",
  products: "product",
  [IMPORT_SHEET_NAMES.variant.toLowerCase()]: "variant",
  bienthe: "variant",
  variant: "variant",
  variants: "variant",
  [IMPORT_SHEET_NAMES.specification.toLowerCase()]: "specification",
  thongso: "specification",
  specification: "specification",
  specs: "specification",
  [IMPORT_SHEET_NAMES.customization.toLowerCase()]: "customization",
  tuychinh: "customization",
  customization: "customization",
  customizations: "customization",
};

function normalizeSheetKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "");
}

function detectEntityType(sheetName: string): ProductImportEntityType | "guide" | "unknown" {
  const key = normalizeSheetKey(sheetName);
  return ENTITY_SHEET_ALIASES[key] ?? "unknown";
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvBuffer(buffer: Buffer): { headers: string[]; rawRows: Record<string, unknown>[] } {
  const text = stripBom(buffer.toString("utf-8"));
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { headers: [], rawRows: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rawRows = lines.slice(1).map((line) => {
    const vals = parseCsvLine(line).map((v) => v.replace(/^"|"$/g, ""));
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? "";
    });
    return row;
  });

  return { headers, rawRows };
}

function isEmptyRow(raw: Record<string, unknown>): boolean {
  return Object.values(raw).every((v) => v == null || String(v).trim() === "");
}

function defaultMappingForEntity(
  entityType: ProductImportEntityType,
  headers: string[],
): ProductImportColumnMapping {
  const map: ProductImportColumnMapping = {
    productName: "",
    category: "",
  };
  const lowerHeaders = new Map(headers.map((h) => [h.toLowerCase(), h]));

  function pick(...keys: string[]): string | undefined {
    for (const key of keys) {
      const found = lowerHeaders.get(key.toLowerCase());
      if (found) return found;
    }
    return undefined;
  }

  if (entityType === "product") {
    map.productName = pick("name", "productName", "tên sản phẩm", "ten san pham") ?? "";
    map.category = pick("category", "categorySlug", "categoryCode", "danh mục", "danh muc") ?? "";
    map.productCode = pick("productCode", "mã sản phẩm");
    map.systemCode = pick("systemCode");
    map.slug = pick("slug");
    map.shortDescription = pick("shortDescription");
    map.description = pick("description");
    map.material = pick("material");
    map.form = pick("form");
    map.fit = pick("fit");
    map.gsm = pick("gsm");
    map.defaultMoq = pick("defaultMoq", "moq");
    map.leadTime = pick("leadTime");
    map.supportsPrinting = pick("supportsPrinting");
    map.supportsEmbroidery = pick("supportsEmbroidery");
    map.supportsOem = pick("supportsOem");
    map.tags = pick("tags");
    map.featuredImage = pick("featuredImageUrl", "featuredImage");
    map.galleryUrls = pick("galleryUrls", "gallery");
    map.status = pick("status");
    map.seoTitle = pick("seoTitle");
    map.seoDescription = pick("seoDescription");
  }

  if (entityType === "variant") {
    map.productCode = pick("productCode");
    map.systemCode = pick("systemCode");
    map.slug = pick("slug");
    map.productId = pick("productId", "id");
    map.sku = pick("sku");
    map.displayLabel = pick("displayLabel");
    map.optionValues = pick("optionValues", "optionValue");
    map.colorName = pick("colorName");
    map.colorCode = pick("colorCode");
    map.sizeName = pick("sizeName");
    map.materialOverride = pick("materialOverride");
    map.stockQty = pick("stockQty");
    map.stockStatus = pick("stockStatus");
    map.moqOverride = pick("moqOverride");
    map.leadTimeOverride = pick("leadTimeOverride");
    map.imageUrl = pick("imageUrl");
    map.variantStatus = pick("variantStatus");
    map.wholesalePrice = pick("wholesalePrice");
    map.dealerPrice = pick("dealerPrice");
  }

  if (entityType === "specification") {
    map.productCode = pick("productCode");
    map.systemCode = pick("systemCode");
    map.specGroup = pick("group", "specGroup");
    map.specLabel = pick("label", "specLabel");
    map.specValue = pick("value", "specValue");
    map.specSortOrder = pick("sortOrder", "specSortOrder");
  }

  if (entityType === "customization") {
    map.productCode = pick("productCode");
    map.systemCode = pick("systemCode");
    map.capability = pick("capability", "label");
    map.capabilityDescription = pick("description", "capabilityDescription");
    map.capabilitySortOrder = pick("sortOrder", "capabilitySortOrder");
    map.capabilityEnabled = pick("enabled", "capabilityEnabled");
  }

  return map;
}

function entityTypesForMode(mode: ProductImportMode): ProductImportEntityType[] {
  switch (mode) {
    case "create-product":
      return ["product", "variant", "specification", "customization"];
    case "update-product":
      return ["product"];
    case "import-variants":
      return ["variant"];
    case "update-variants-bulk":
      return ["variant"];
    default:
      return ["product", "variant"];
  }
}

export function validateImportFileMeta(fileName: string, fileSize: number): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
    return "Chỉ hỗ trợ tệp .csv hoặc .xlsx.";
  }
  if (fileSize > IMPORT_FILE_MAX_BYTES) {
    return `Tệp vượt quá ${Math.round(IMPORT_FILE_MAX_BYTES / 1024 / 1024)}MB.`;
  }
  return null;
}

export async function parseImportFileBuffer(
  buffer: Buffer,
  fileName: string,
  importMode: ProductImportMode,
): Promise<ParsedImportFile> {
  const metaError = validateImportFileMeta(fileName, buffer.length);
  if (metaError) throw new Error(metaError);

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "csv";
  const warnings: string[] = [];
  const sheets: ParsedImportFile["sheets"] = [];
  const allowedEntities = new Set(entityTypesForMode(importMode));

  if (ext === "csv") {
    const { headers, rawRows } = parseCsvBuffer(buffer);
    const entityType: ProductImportEntityType =
      importMode === "import-variants" || importMode === "update-variants-bulk"
        ? "variant"
        : "product";
    sheets.push({
      name: "CSV",
      entityType,
      headers,
      rawRows: rawRows.filter((r) => !isEmptyRow(r)),
    });
  } else {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer", cellFormula: false, cellHTML: false });
    for (const sheetName of wb.SheetNames) {
      const entityType = detectEntityType(sheetName);
      if (entityType === "guide") {
        sheets.push({ name: sheetName, entityType: "guide", headers: [], rawRows: [] });
        continue;
      }
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: true,
      });
      const headers = data.length ? Object.keys(data[0]) : [];
      const filtered = data.filter((r) => !isEmptyRow(r));
      const resolvedType =
        entityType === "unknown"
          ? importMode === "import-variants" || importMode === "update-variants-bulk"
            ? "variant"
            : "product"
          : entityType;
      sheets.push({
        name: sheetName,
        entityType: resolvedType,
        headers,
        rawRows: filtered,
      });
    }
  }

  const rows: ProductImportRow[] = [];
  const rawRows: Record<string, unknown>[] = [];
  let globalIndex = 0;

  for (const sheet of sheets) {
    if (sheet.entityType === "guide" || sheet.entityType === "unknown") continue;
    if (!allowedEntities.has(sheet.entityType)) {
      warnings.push(`Bỏ qua sheet "${sheet.name}" vì không phù hợp chế độ nhập.`);
      continue;
    }

    const mapping = defaultMappingForEntity(sheet.entityType, sheet.headers);
    for (const raw of sheet.rawRows) {
      const mapped = mapRawRowToImportRow(raw, mapping, globalIndex, {}, sheet.entityType);
      mapped.sheetName = sheet.name;
      rows.push(mapped);
      rawRows.push(raw);
      globalIndex++;
      if (globalIndex > IMPORT_MAX_ROWS) {
        throw new Error(`Tệp vượt quá ${IMPORT_MAX_ROWS} dòng.`);
      }
    }
  }

  if (!rows.length) {
    throw new Error("Không tìm thấy dòng dữ liệu hợp lệ trong tệp.");
  }

  return {
    fileName,
    fileType: ext === "csv" ? "csv" : "xlsx",
    sheets,
    rows,
    rawRows,
    warnings,
  };
}
