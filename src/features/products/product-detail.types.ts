import type { ProductImageRecord } from "@/lib/productImages";
import type { ProductSizeChart } from "@/features/products/product-size-chart";

export type ProductOptionGroup = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  values: ProductOptionValueView[];
};

export type ProductOptionValueView = {
  id: string;
  label: string;
  valueCode?: string | null;
  /** Public-safe structured swatch from AttributeValue.hexCode / Color.hex only. */
  swatchHex?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
};

export type ProductSpecificationRow = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
};

export type ProductCustomizationRow = {
  id: string;
  label: string;
  description?: string | null;
  sortOrder: number;
};

export type PublicProductVariantDetail = {
  id: string;
  sku: string;
  label: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
  stockStatus: string;
  stockQty?: number | null;
  imageUrl?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  material?: string | null;
  optionValueIds: string[];
  optionSelections: Record<string, string>;
};

export type PublicProductDetail = {
  id: string;
  slug: string;
  name: string;
  productCode?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  descriptionBlocks?: import("@/features/products/product-description-blocks").PublicProductDescriptionBlock[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  category: { id: string; name: string; slug: string };
  material?: string | null;
  form?: string | null;
  fit?: string | null;
  gsm?: number | null;
  highlightMaterial?: string | null;
  highlightForm?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  useCases: string[];
  targetCustomers: string[];
  images: ProductImageRecord[];
  optionGroups: ProductOptionGroup[];
  variants: PublicProductVariantDetail[];
  specifications: ProductSpecificationRow[];
  customizations: ProductCustomizationRow[];
  hasStructuredOptions: boolean;
  /** Normalized public size chart when present and enabled; otherwise null. */
  sizeChart: ProductSizeChart | null;
};
