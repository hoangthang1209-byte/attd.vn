import type { KnowledgeBaseEntryType } from "@prisma/client";
import type { KnowledgeBaseUsageScope } from "@/features/knowledge-base/knowledge-base-types";

export type KnowledgeBaseTemplate = {
  id: string;
  label: string;
  type: KnowledgeBaseEntryType;
  titlePlaceholder: string;
  summaryPlaceholder: string;
  contentPlaceholder: string;
  suggestedTags: string[];
  usageScope: KnowledgeBaseUsageScope[];
  structuredData: Record<string, unknown>;
};

export const KNOWLEDGE_BASE_TEMPLATES: KnowledgeBaseTemplate[] = [
  {
    id: "product",
    label: "Sản phẩm",
    type: "PRODUCT",
    titlePlaceholder: "Ví dụ: Áo thun trơn — nhóm sản phẩm",
    summaryPlaceholder: "Mô tả ngắn về sản phẩm, đối tượng khách và ứng dụng chính.",
    contentPlaceholder:
      "Giới thiệu sản phẩm, chất liệu, form dáng, MOQ, ứng dụng cho đại lý/xưởng in/doanh nghiệp.",
    suggestedTags: ["sản phẩm", "áo thun", "bán sỉ"],
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    structuredData: {
      material: "",
      form: "",
      colors: [],
      sizes: [],
      moq: "",
      useCases: ["In logo", "Đồng phục", "Bán sỉ"],
    },
  },
  {
    id: "oem",
    label: "OEM",
    type: "OEM",
    titlePlaceholder: "Ví dụ: Dịch vụ OEM áo thun theo yêu cầu",
    summaryPlaceholder: "Tóm tắt năng lực OEM, quy trình và đối tượng khách.",
    contentPlaceholder: "Mô tả quy trình OEM, MOQ, lead time, dịch vụ in/thêu/đóng gói.",
    suggestedTags: ["OEM", "private label", "sản xuất"],
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    structuredData: {
      moq: "Tùy sản phẩm — cần xác minh",
      leadTime: "Theo số lượng và yêu cầu",
      services: ["May", "In", "Thêu", "Đóng gói"],
    },
  },
  {
    id: "dealer",
    label: "Đại lý",
    type: "DEALER",
    titlePlaceholder: "Ví dụ: Chính sách đại lý áo thun trơn",
    summaryPlaceholder: "Tóm tắt cơ hội hợp tác đại lý và lợi ích chính.",
    contentPlaceholder: "Mô tả đối tượng, điều kiện hợp tác, hỗ trợ marketing và vận chuyển.",
    suggestedTags: ["đại lý", "bán sỉ", "nguồn hàng"],
    usageScope: ["BLOG_AI", "SALES", "DEALER_PORTAL"],
    structuredData: {
      targetAudience: "Đại lý, xưởng in, shop online",
      pricingPolicy: "",
      partnershipTerms: "",
    },
  },
  {
    id: "policy",
    label: "Chính sách",
    type: "POLICY",
    titlePlaceholder: "Ví dụ: Chính sách giao hàng toàn quốc",
    summaryPlaceholder: "Tóm tắt chính sách và đối tượng áp dụng.",
    contentPlaceholder: "Mô tả điều kiện, thời gian áp dụng và quy trình thực hiện.",
    suggestedTags: ["chính sách", "quy trình"],
    usageScope: ["BLOG_AI", "CRM", "SALES"],
    structuredData: {
      policyName: "",
      targetAudience: "Khách B2B, đại lý, doanh nghiệp",
      effectivePeriod: "",
      conditions: "",
    },
  },
  {
    id: "case-study",
    label: "Case Study",
    type: "CASE_STUDY",
    titlePlaceholder: "Ví dụ: Dự án đồng phục cho doanh nghiệp F&B",
    summaryPlaceholder: "Tóm tắt khách hàng, quy mô và kết quả.",
    contentPlaceholder: "Mô tả bài toán, giải pháp ATTD triển khai và kết quả đạt được.",
    suggestedTags: ["case study", "khách hàng"],
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SALES"],
    structuredData: { keyPoints: ["Khách hàng", "Quy mô", "Giải pháp", "Kết quả"] },
  },
  {
    id: "faq",
    label: "FAQ",
    type: "FAQ",
    titlePlaceholder: "Ví dụ: FAQ về nguồn hàng áo thun trơn",
    summaryPlaceholder: "Tóm tắt nhóm câu hỏi thường gặp.",
    contentPlaceholder: "Ghi chú thêm về phạm vi tư vấn và cách sử dụng FAQ này.",
    suggestedTags: ["FAQ", "tư vấn"],
    usageScope: ["BLOG_AI", "PUBLIC_FAQ", "SALES"],
    structuredData: {
      questions: ["MOQ là bao nhiêu?", "Thời gian giao hàng?"],
      answers: ["Tùy sản phẩm — cần xác minh", "Theo khu vực và số lượng"],
    },
  },
  {
    id: "brand-voice",
    label: "Brand Voice",
    type: "BRAND_VOICE",
    titlePlaceholder: "Ví dụ: Giọng thương hiệu ATTD",
    summaryPlaceholder: "Tóm tắt tone, phong cách và thông điệp cốt lõi.",
    contentPlaceholder: "Mô tả giọng văn, từ nên dùng/tránh, định vị thương hiệu.",
    suggestedTags: ["brand voice", "thương hiệu"],
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "PRODUCT_AI"],
    structuredData: {
      keyPoints: ["Chuyên nghiệp", "Rõ ràng", "B2B", "Premium"],
    },
  },
];
