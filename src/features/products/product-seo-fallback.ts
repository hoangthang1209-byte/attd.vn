import { toSlug } from "@/lib/slug";
import { isProductEntryMode, type ProductEntryMode } from "@/features/products/product-entry-modes";

export const DEFAULT_COMPANY_NAME = "ATTD.vn";

export type ProductSeoFallbackInput = {
  name: string;
  categoryName?: string | null;
  productMode?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  companyName?: string;
};

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function buildProductSlugFallback(name: string): string {
  return toSlug(cleanText(name));
}

export function buildProductSeoTitleFallback(input: ProductSeoFallbackInput): string {
  const name = cleanText(input.name);
  const category = cleanText(input.categoryName);
  const company = cleanText(input.companyName) || DEFAULT_COMPANY_NAME;
  if (!name) return "";
  const head = category ? `${name} - ${category}` : name;
  return `${head} | ${company}`;
}

function modePhrase(productMode: string | null | undefined): string {
  if (!isProductEntryMode(productMode)) return "";
  const mode = productMode as ProductEntryMode;
  switch (mode) {
    case "WHOLESALE_AVAILABLE":
      return "Hàng có sẵn, bán sỉ số lượng lớn.";
    case "MADE_TO_ORDER":
      return "Sản xuất theo yêu cầu, in/thêu logo riêng.";
    case "GIFT_MERCHANDISE":
      return "Quà tặng doanh nghiệp, in logo theo yêu cầu.";
    case "OEM_SOURCING":
      return "Nhận OEM / sourcing theo yêu cầu.";
    default:
      return "";
  }
}

export function buildProductMetaDescriptionFallback(input: ProductSeoFallbackInput): string {
  const name = cleanText(input.name);
  const category = cleanText(input.categoryName);
  const company = cleanText(input.companyName) || DEFAULT_COMPANY_NAME;
  if (!name) return "";

  const parts: string[] = [];
  parts.push(category ? `${name} thuộc nhóm ${category}.` : `${name}.`);
  if (typeof input.defaultMoq === "number" && input.defaultMoq > 0) parts.push(`MOQ từ ${input.defaultMoq}.`);
  if (cleanText(input.leadTime)) parts.push(`Thời gian sản xuất ${cleanText(input.leadTime)}.`);
  const phrase = modePhrase(input.productMode);
  if (phrase) parts.push(phrase);
  parts.push(`Liên hệ ${company} để được báo giá.`);
  return parts.join(" ");
}

export function buildProductImageAltFallback(input: ProductSeoFallbackInput): string {
  const name = cleanText(input.name);
  const category = cleanText(input.categoryName);
  if (!name) return "";
  return category ? `${name} - ${category}` : name;
}

export type ResolvedProductSeoFallback = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  imageAlt: string;
};

export function resolveProductSeoWithFallback(
  input: ProductSeoFallbackInput & {
    manualSlug?: string | null;
    manualSeoTitle?: string | null;
    manualSeoDescription?: string | null;
    manualImageAlt?: string | null;
  },
): ResolvedProductSeoFallback {
  return {
    slug: cleanText(input.manualSlug) || buildProductSlugFallback(input.name),
    seoTitle: cleanText(input.manualSeoTitle) || buildProductSeoTitleFallback(input),
    seoDescription: cleanText(input.manualSeoDescription) || buildProductMetaDescriptionFallback(input),
    imageAlt: cleanText(input.manualImageAlt) || buildProductImageAltFallback(input),
  };
}

export const SEO_FALLBACK_HELPER =
  "Hệ thống đã tạo SEO cơ bản. Bạn có thể chỉnh nâng cao nếu cần.";
