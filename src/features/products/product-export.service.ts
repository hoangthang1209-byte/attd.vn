import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import type { ProductListParams } from "@/features/products/product-admin.service";
import {
  EXPORT_MAX_PRODUCTS,
  EXPORT_SCOPE_LABELS,
  type ExportEntityType,
} from "@/features/products/product-export.constants";
import type { ProductExportBundle, ProductExportOptions } from "@/features/products/product-export.types";
import {
  buildExportFileName,
  buildExportGuideRows,
  createCsvWithBom,
  mapCustomizationToExportRow,
  mapProductToExportRow,
  mapSpecToExportRow,
  mapVariantToExportRow,
  sheetMetaForEntity,
  type ExportProductRecord,
} from "@/features/products/product-export.mapper";
import { validateExportBundleCompatibility } from "@/features/products/product-export-compatibility";
import { IMPORT_SHEET_NAMES } from "@/features/products/product-import-constants";
import {
  downloadCsvResponse,
  downloadMultiSheetXlsxResponse,
} from "@/features/import/import-template-utils";

const EXPORT_PRODUCT_INCLUDE = {
  category: { select: { slug: true, skuCode: true } },
  options: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { sortOrder: "asc" as const } } },
  },
  specifications: { orderBy: { sortOrder: "asc" as const } },
  attributeAssignments: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      attribute: { select: { name: true, code: true } },
      attributeValue: { select: { name: true } },
    },
  },
  customizationCapabilities: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    orderBy: { createdAt: "asc" as const },
    include: { optionValues: { select: { optionValueId: true } } },
  },
} satisfies Prisma.ProductInclude;

async function resolveProductIds(options: ProductExportOptions): Promise<string[]> {
  if (options.scope === "single") {
    const id = options.productIds?.[0];
    if (!id) {
      throw new ProductAdminValidationError("Thiếu sản phẩm để xuất.", { productIds: "Chưa chọn sản phẩm." });
    }
    return [id];
  }

  if (options.scope === "selected") {
    const ids = [...new Set((options.productIds ?? []).map((id) => id.trim()).filter(Boolean))];
    if (!ids.length) {
      throw new ProductAdminValidationError("Chưa chọn sản phẩm để xuất.", { productIds: "Danh sách trống." });
    }
    return ids;
  }

  const where = buildWhereFromFilters(options.filters);

  if (options.scope === "filtered" && Object.keys(where).length === 0 && !options.filters?.search) {
    throw new ProductAdminValidationError(
      "Hãy áp dụng bộ lọc trước khi xuất theo bộ lọc.",
      { filters: "Bộ lọc trống." },
    );
  }

  const products = await prisma.product.findMany({
    where,
    select: { id: true },
    orderBy: [{ productCode: "asc" }, { name: "asc" }],
    take: EXPORT_MAX_PRODUCTS + 1,
  });

  if (products.length > EXPORT_MAX_PRODUCTS) {
    throw new ProductAdminValidationError(
      `Số lượng sản phẩm vượt giới hạn xuất (${EXPORT_MAX_PRODUCTS}). Hãy thu hẹp bộ lọc hoặc xuất theo từng nhóm.`,
      { scope: "Vượt giới hạn." },
      `Có hơn ${EXPORT_MAX_PRODUCTS} sản phẩm phù hợp.`,
    );
  }

  return products.map((p) => p.id);
}

function buildWhereFromFilters(filters?: ProductListParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (!filters) return where;

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status) where.status = filters.status as Prisma.EnumProductStatusFilter["equals"];
  if (filters.supportsPrinting) where.supportsPrinting = true;
  if (filters.supportsOem) where.supportsOem = true;

  if (filters.stockStatus) {
    where.variants = { some: { stockStatus: filters.stockStatus as Prisma.EnumStockStatusFilter["equals"] } };
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { productCode: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }

  return where;
}

async function fetchExportProducts(ids: string[]): Promise<ExportProductRecord[]> {
  const uniqueIds = [...new Set(ids)];
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds } },
    include: EXPORT_PRODUCT_INCLUDE,
    orderBy: [{ productCode: "asc" }, { name: "asc" }],
  });

  if (products.length !== uniqueIds.length) {
    throw new ProductAdminValidationError(
      "Một hoặc nhiều sản phẩm không tồn tại.",
      { productIds: "ID không hợp lệ." },
    );
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  return uniqueIds.map((id) => byId.get(id)!);
}

export async function buildProductExportBundle(options: ProductExportOptions): Promise<ProductExportBundle> {
  const productIds = await resolveProductIds(options);
  if (!productIds.length) {
    throw new ProductAdminValidationError(
      "Không có sản phẩm phù hợp để xuất.",
      { scope: "Không có dữ liệu." },
    );
  }

  const products = await fetchExportProducts(productIds);

  const productRows = products.map(mapProductToExportRow);
  const variantRows = products.flatMap((product) =>
    product.variants
      .filter((variant) => options.includeInactiveVariants || variant.variantStatus === "ACTIVE")
      .map((variant) => mapVariantToExportRow(product, variant, options)),
  );
  const specRows = options.includeSpecifications
    ? products.flatMap((product) => product.specifications.map((spec) => mapSpecToExportRow(product, spec)))
    : [];
  const customizationRows = options.includeCustomizations
    ? products.flatMap((product) =>
        product.customizationCapabilities.map((item) => mapCustomizationToExportRow(product, item)),
      )
    : [];

  const guideRows = buildExportGuideRows(options, {
    productCount: products.length,
    variantCount: variantRows.length,
    scopeLabel: EXPORT_SCOPE_LABELS[options.scope],
  });

  const sheets = [
    { sheetName: IMPORT_SHEET_NAMES.guide, headers: ["muc", "noiDung"], rows: guideRows },
    { sheetName: IMPORT_SHEET_NAMES.product, headers: sheetMetaForEntity("product").headers, rows: productRows },
    { sheetName: IMPORT_SHEET_NAMES.variant, headers: sheetMetaForEntity("variant").headers, rows: variantRows },
  ];

  if (options.includeSpecifications) {
    sheets.push({
      sheetName: IMPORT_SHEET_NAMES.specification,
      headers: sheetMetaForEntity("specification").headers,
      rows: specRows,
    });
  }

  if (options.includeCustomizations) {
    sheets.push({
      sheetName: IMPORT_SHEET_NAMES.customization,
      headers: sheetMetaForEntity("customization").headers,
      rows: customizationRows,
    });
  }

  const compatibilityIssues = validateExportBundleCompatibility(sheets);
  if (compatibilityIssues.length) {
    const first = compatibilityIssues[0];
    throw new ProductAdminValidationError(
      "Dữ liệu xuất không tương thích với import v2.",
      { export: first.message },
      `${first.sheet} hàng ${first.row}: ${first.message}`,
    );
  }

  return {
    fileName: buildExportFileName(options, options.cloneTemplate ? "mau-nhan-ban" : undefined),
    sheets,
    productCount: products.length,
    variantCount: variantRows.length,
  };
}

export async function createProductExportResponse(options: ProductExportOptions): Promise<Response> {
  const bundle = await buildProductExportBundle(options);

  if (options.format === "csv") {
    const entity: ExportEntityType = options.csvEntity ?? "product";
    const sheet =
      bundle.sheets.find((s) => s.sheetName === sheetMetaForEntity(entity).sheetName) ??
      bundle.sheets.find((s) => s.sheetName === IMPORT_SHEET_NAMES.product)!;

    const csv = createCsvWithBom(sheet.headers, sheet.rows);
    const entitySlug =
      entity === "product"
        ? "san-pham"
        : entity === "variant"
          ? "bien-the"
          : entity === "specification"
            ? "thong-so"
            : "tuy-chinh";

    return downloadCsvResponse(`${bundle.fileName}-${entitySlug}`, csv);
  }

  return downloadMultiSheetXlsxResponse(bundle.fileName, bundle.sheets);
}
