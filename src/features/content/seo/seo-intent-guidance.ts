import type { SeoContentType, SeoSearchIntent } from "@prisma/client";

/** Advisory content-type suggestions from search intent — never auto-applied. */
const INTENT_CONTENT_SUGGESTIONS: Partial<Record<SeoSearchIntent, SeoContentType[]>> = {
  INFORMATIONAL: ["BLOG_ARTICLE", "KNOWLEDGE_BASE", "GLOSSARY", "FAQ"],
  COMMERCIAL: ["BLOG_ARTICLE", "COMPARISON", "PRODUCT_GUIDE", "CAPABILITY_PAGE"],
  TRANSACTIONAL: ["LANDING_PAGE", "CATEGORY_PAGE", "PRODUCT_GUIDE"],
  NAVIGATIONAL: ["LANDING_PAGE", "DEALER_CONTENT", "CAPABILITY_PAGE"],
  LOCAL: ["LANDING_PAGE", "CAPABILITY_PAGE"],
  MIXED: ["BLOG_ARTICLE", "LANDING_PAGE", "COMPARISON"],
};

export function suggestContentTypeFromIntent(intent: SeoSearchIntent): SeoContentType[] {
  return INTENT_CONTENT_SUGGESTIONS[intent] ?? ["BLOG_ARTICLE", "OTHER"];
}

export function intentGuidanceText(intent: SeoSearchIntent): string {
  switch (intent) {
    case "INFORMATIONAL":
      return "Phù hợp hướng dẫn, kiến thức, glossary, FAQ.";
    case "COMMERCIAL":
      return "Phù hợp so sánh, hướng dẫn chọn nhà cung cấp, báo giá, năng lực.";
    case "TRANSACTIONAL":
      return "Phù hợp landing page, trang danh mục, trang báo giá.";
    case "NAVIGATIONAL":
      return "Phù hợp trang thương hiệu, đại lý, truy cập nhanh.";
    case "LOCAL":
      return "Phù hợp trang khu vực / dịch vụ địa phương.";
    case "MIXED":
      return "Kết hợp thông tin và chuyển đổi — cân nhắc blog + landing.";
    default:
      return "";
  }
}
