import type { MediaBundleContentType } from "@prisma/client";
import type { SeoContentType } from "@prisma/client";

/** Map SEO content type to Media Bundle content type for coverage planning. */
export function mapSeoContentTypeToBundleType(
  contentType: SeoContentType,
): MediaBundleContentType {
  switch (contentType) {
    case "BLOG_ARTICLE":
    case "COMPARISON":
    case "KNOWLEDGE_BASE":
    case "FAQ":
    case "GLOSSARY":
      return "BLOG_ARTICLE";
    case "LANDING_PAGE":
    case "CAPABILITY_PAGE":
    case "CATEGORY_PAGE":
      return "LANDING_PAGE";
    case "PRODUCT_GUIDE":
      return "PRODUCT_CONTENT";
    case "CASE_STUDY":
      return "CASE_STUDY";
    case "DEALER_CONTENT":
      return "CAMPAIGN";
    default:
      return "GENERAL";
  }
}

export function mapMediaPlanOverallStatus(
  status: string,
): string {
  const labels: Record<string, string> = {
    CRITICAL: "Thiếu nghiêm trọng",
    INSUFFICIENT: "Chưa đủ",
    BASIC: "Cơ bản",
    GOOD: "Tốt",
    STRONG: "Mạnh",
  };
  return labels[status] ?? status;
}
