import type {
  SeoContentType,
  SeoFunnelStage,
  SeoInternalLinkStatus,
  SeoKeywordType,
  SeoSearchIntent,
  SeoStrategyStatus,
  SeoTargetEntityType,
  SeoTopicPriority,
  SeoTopicStatus,
} from "@prisma/client";

export const SEO_STRATEGY_STATUS_LABELS: Record<SeoStrategyStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Đã lưu trữ",
};

export const SEO_TOPIC_STATUS_LABELS: Record<SeoTopicStatus, string> = {
  IDEA: "Ý tưởng",
  RESEARCHING: "Đang nghiên cứu",
  APPROVED: "Đã duyệt",
  BRIEF_READY: "Sẵn sàng brief",
  DRAFTING: "Đang viết",
  REVIEW: "Đang review",
  PUBLISHED: "Đã xuất bản",
  PAUSED: "Tạm dừng",
  REJECTED: "Từ chối",
  ARCHIVED: "Đã lưu trữ",
};

export const SEO_SEARCH_INTENT_LABELS: Record<SeoSearchIntent, string> = {
  INFORMATIONAL: "Thông tin",
  COMMERCIAL: "Thương mại",
  TRANSACTIONAL: "Giao dịch",
  NAVIGATIONAL: "Điều hướng",
  LOCAL: "Địa phương",
  MIXED: "Hỗn hợp",
};

export const SEO_CONTENT_TYPE_LABELS: Record<SeoContentType, string> = {
  BLOG_ARTICLE: "Bài Blog",
  LANDING_PAGE: "Landing Page",
  CATEGORY_PAGE: "Trang danh mục",
  PRODUCT_GUIDE: "Hướng dẫn sản phẩm",
  CASE_STUDY: "Case Study",
  KNOWLEDGE_BASE: "Knowledge Base",
  COMPARISON: "So sánh",
  GLOSSARY: "Thuật ngữ",
  FAQ: "FAQ",
  CAPABILITY_PAGE: "Trang năng lực",
  DEALER_CONTENT: "Nội dung đại lý",
  OTHER: "Khác",
};

export const SEO_FUNNEL_STAGE_LABELS: Record<SeoFunnelStage, string> = {
  AWARENESS: "Nhận biết",
  CONSIDERATION: "Cân nhắc",
  DECISION: "Quyết định",
  RETENTION: "Giữ chân",
};

export const SEO_TOPIC_PRIORITY_LABELS: Record<SeoTopicPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  CRITICAL: "Quan trọng",
};

export const SEO_KEYWORD_TYPE_LABELS: Record<SeoKeywordType, string> = {
  PRIMARY: "Chính",
  SECONDARY: "Phụ",
  LONG_TAIL: "Long-tail",
  QUESTION: "Câu hỏi",
  ENTITY: "Thực thể",
  SUPPORTING: "Hỗ trợ",
  NEGATIVE: "Loại trừ",
};

export const SEO_TARGET_ENTITY_LABELS: Record<SeoTargetEntityType, string> = {
  BLOG_POST: "Blog",
  LANDING_PAGE: "Landing Page",
  PRODUCT: "Sản phẩm",
  CATEGORY: "Danh mục",
  MANUFACTURING_ASSET: "Manufacturing",
  DEALER_PAGE: "Đại lý",
  EXTERNAL: "Bên ngoài",
  NONE: "Chưa liên kết",
};

export const SEO_INTERNAL_LINK_STATUS_LABELS: Record<SeoInternalLinkStatus, string> = {
  SUGGESTED: "Đề xuất",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  IMPLEMENTED: "Đã triển khai",
};

export const SEO_KEYWORD_SOURCE_LABELS: Record<string, string> = {
  Manual: "Nhập tay",
  "Search Console": "Search Console",
  Ahrefs: "Ahrefs",
  Semrush: "Semrush",
  "Google Ads": "Google Ads",
  Other: "Khác",
};

export const SEO_METRIC_DATA_LABEL = {
  manual: "Dữ liệu nhập",
  missing: "Chưa có dữ liệu",
  source: "Nguồn",
} as const;
