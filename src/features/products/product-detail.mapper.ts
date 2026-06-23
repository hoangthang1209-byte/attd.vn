import { buildProductImages } from "@/lib/productImages";
import type {
  ProductCustomizationRow,
  ProductOptionGroup,
  ProductSpecificationRow,
  PublicProductDetail,
  PublicProductVariantDetail,
} from "@/features/products/product-detail.types";

type DbOptionValue = {
  id: string;
  label: string;
  valueCode: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

type DbOption = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  values: DbOptionValue[];
};

type DbVariantOptionLink = {
  optionValue: DbOptionValue & {
    option: { id: string; slug: string; name: string };
  };
};

type DbVariant = {
  id: string;
  sku: string;
  displayLabel: string | null;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
  dimensions: string | null;
  capacity: string | null;
  stockStatus: string;
  stockQty: number;
  imageUrl: string | null;
  moqOverride: number | null;
  leadTimeOverride: string | null;
  materialOverride: string | null;
  color: { name: string } | null;
  size: { name: string } | null;
  optionValues: DbVariantOptionLink[];
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  productCode: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  material: string | null;
  form: string | null;
  fit: string | null;
  gsm: number | null;
  defaultMoq: number | null;
  leadTime: string | null;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  useCases: string[];
  targetCustomers: string[];
  category: { id: string; name: string; slug: string };
  images: { id: string; imageUrl: string; altText: string | null; sortOrder: number }[];
  featuredImage: string | null;
  gallery: string[];
  options: DbOption[];
  specifications: { id: string; label: string; value: string; sortOrder: number }[];
  customizationCapabilities: {
    id: string;
    label: string;
    description: string | null;
    sortOrder: number;
    enabled: boolean;
  }[];
  variants: DbVariant[];
};

function getVariantSizeKey(v: DbVariant): string | null {
  return v.sizeName ?? v.size?.name ?? v.capacity ?? v.dimensions ?? null;
}

function buildVariantLabel(v: DbVariant, selections: Record<string, string>): string {
  if (v.displayLabel?.trim()) return v.displayLabel.trim();
  const parts = Object.values(selections).filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  const legacy = [v.colorName ?? v.color?.name, getVariantSizeKey(v)].filter(Boolean);
  if (legacy.length > 0) return legacy.join(" / ");
  return v.sku;
}

function buildLegacyOptionGroups(variants: DbVariant[]): ProductOptionGroup[] {
  const groups: ProductOptionGroup[] = [];

  const colorMap = new Map<string, { label: string; valueCode: string | null; imageUrl: string | null }>();
  for (const v of variants) {
    const name = v.colorName ?? v.color?.name;
    if (!name) continue;
    const prev = colorMap.get(name);
    colorMap.set(name, {
      label: name,
      valueCode: v.colorCode ?? prev?.valueCode ?? null,
      imageUrl: v.imageUrl ?? prev?.imageUrl ?? null,
    });
  }
  if (colorMap.size > 0) {
    groups.push({
      id: "legacy-color",
      slug: "color",
      name: "Màu sắc",
      sortOrder: 0,
      values: Array.from(colorMap.entries()).map(([label, meta], index) => ({
        id: `legacy-color-${index}`,
        label,
        valueCode: meta.valueCode,
        imageUrl: meta.imageUrl,
        sortOrder: index,
      })),
    });
  }

  const sizeSet = new Set<string>();
  for (const v of variants) {
    const key = getVariantSizeKey(v);
    if (key) sizeSet.add(key);
  }
  if (sizeSet.size > 0) {
    groups.push({
      id: "legacy-size",
      slug: "size",
      name: "Kích thước",
      sortOrder: 1,
      values: Array.from(sizeSet).map((label, index) => ({
        id: `legacy-size-${index}`,
        label,
        valueCode: null,
        imageUrl: null,
        sortOrder: index,
      })),
    });
  }

  const materials = new Set(
    variants.map((v) => v.materialOverride?.trim()).filter(Boolean) as string[],
  );
  if (materials.size > 0) {
    groups.push({
      id: "legacy-material",
      slug: "material",
      name: "Chất liệu",
      sortOrder: 2,
      values: Array.from(materials).map((label, index) => ({
        id: `legacy-material-${index}`,
        label,
        valueCode: null,
        imageUrl: null,
        sortOrder: index,
      })),
    });
  }

  return groups;
}

function mapStructuredOptionGroups(options: DbOption[]): ProductOptionGroup[] {
  return options
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((opt) => ({
      id: opt.id,
      slug: opt.slug,
      name: opt.name,
      sortOrder: opt.sortOrder,
      values: opt.values
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((val) => ({
          id: val.id,
          label: val.label,
          valueCode: val.valueCode,
          imageUrl: val.imageUrl,
          sortOrder: val.sortOrder,
        })),
    }));
}

function mapVariant(
  v: DbVariant,
  productMaterial: string | null,
  productMoq: number | null,
  productLeadTime: string | null,
  hasStructuredOptions: boolean,
): PublicProductVariantDetail {
  const optionSelections: Record<string, string> = {};
  const optionValueIds: string[] = [];

  if (hasStructuredOptions) {
    for (const link of v.optionValues ?? []) {
      const optionValue = link?.optionValue;
      const option = optionValue?.option;
      if (!optionValue?.id || !option?.slug) continue;
      optionValueIds.push(optionValue.id);
      optionSelections[option.slug] = optionValue.label;
    }
  } else {
    const color = v.colorName ?? v.color?.name;
    const size = getVariantSizeKey(v);
    if (color) optionSelections.color = color;
    if (size) optionSelections.size = size;
    if (v.materialOverride?.trim()) optionSelections.material = v.materialOverride.trim();
  }

  return {
    id: v.id,
    sku: v.sku,
    label: buildVariantLabel(v, optionSelections),
    colorName: v.colorName ?? v.color?.name ?? null,
    colorCode: v.colorCode,
    sizeName: v.sizeName ?? v.size?.name ?? null,
    dimensions: v.dimensions,
    capacity: v.capacity,
    stockStatus: v.stockStatus,
    stockQty: v.stockQty,
    imageUrl: v.imageUrl,
    moq: v.moqOverride ?? productMoq,
    leadTime: v.leadTimeOverride ?? productLeadTime,
    material: v.materialOverride ?? productMaterial,
    optionValueIds,
    optionSelections,
  };
}

export function mapProductToPublicDetail(product: DbProduct): PublicProductDetail {
  const hasStructuredOptions = (product.options?.length ?? 0) > 0;
  const optionGroups = hasStructuredOptions
    ? mapStructuredOptionGroups(product.options ?? [])
    : buildLegacyOptionGroups(product.variants ?? []);

  const specifications: ProductSpecificationRow[] = (product.specifications ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      sortOrder: row.sortOrder,
    }));

  const customizations: ProductCustomizationRow[] = (product.customizationCapabilities ?? [])
    .filter((c) => c.enabled)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      sortOrder: row.sortOrder,
    }));

  const variants = (product.variants ?? []).map((v) =>
    mapVariant(v, product.material, product.defaultMoq, product.leadTime, hasStructuredOptions),
  );

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    productCode: product.productCode,
    shortDescription: product.shortDescription,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    category: product.category,
    material: product.material,
    form: product.form,
    fit: product.fit,
    gsm: product.gsm,
    defaultMoq: product.defaultMoq,
    leadTime: product.leadTime,
    supportsPrinting: product.supportsPrinting,
    supportsEmbroidery: product.supportsEmbroidery,
    supportsOem: product.supportsOem,
    useCases: product.useCases ?? [],
    targetCustomers: product.targetCustomers ?? [],
    images: buildProductImages(product),
    optionGroups,
    variants,
    specifications,
    customizations,
    hasStructuredOptions,
  };
}

/** Build default customization rows from legacy support flags when none stored. */
export function buildDefaultCustomizationsFromFlags(product: {
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
}): ProductCustomizationRow[] {
  const rows: ProductCustomizationRow[] = [];
  let order = 0;
  if (product.supportsPrinting) {
    rows.push({ id: "flag-printing", label: "In logo / in hình", sortOrder: order++ });
  }
  if (product.supportsEmbroidery) {
    rows.push({ id: "flag-embroidery", label: "Thêu", sortOrder: order++ });
  }
  if (product.supportsOem) {
    rows.push({ id: "flag-oem", label: "OEM / Private Label", sortOrder: order++ });
  }
  return rows;
}
