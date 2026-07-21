/**
 * Sprint 13.0 — Content Revenue Launch Activation constants.
 * Editorial suggestions only. No fabricated SEO metrics.
 */

export const CONTENT_LAUNCH_ARTICLE = {
  title: "Hướng dẫn chọn áo polo đồng phục công ty",
  primaryKeyword: "áo polo đồng phục công ty",
  searchIntent: "COMMERCIAL" as const,
  contentType: "BLOG_ARTICLE" as const,
  funnelStage: "CONSIDERATION" as const,
  status: "IDEA" as const,
  description:
    "Bài SEO đầu tiên của Content Revenue Launch — hướng dẫn chọn áo polo làm đồng phục công ty. Giữ DRAFT đến khi human publish.",
  strategyNameHint: "Content Revenue Launch",
  clusterNameHint: "Áo polo đồng phục công ty",
  clusterCode: "POLO_CORP_UNIFORM",
} as const;

export const CONTENT_LAUNCH_POLO_BUNDLE_CODE = "KG_PILOT_POLO_CORP";

export const CONTENT_LAUNCH_SECONDARY_KEYWORDS = [
  "áo polo công ty",
  "áo polo doanh nghiệp",
  "áo polo đồng phục",
  "may áo polo đồng phục",
  "chất liệu áo polo đồng phục",
  "in logo áo polo công ty",
  "thêu logo áo polo",
  "báo giá áo polo đồng phục",
] as const;

export const CONTENT_LAUNCH_QUESTION_KEYWORDS = [
  "Nên chọn chất liệu nào cho áo polo đồng phục?",
  "Nên in hay thêu logo lên áo polo?",
  "Chọn form áo polo đồng phục như thế nào?",
  "Cần chuẩn bị gì khi đặt áo polo cho doanh nghiệp?",
] as const;

export const CONTENT_LAUNCH_BRIEF_TEMPLATE = {
  workingTitle: "Hướng dẫn chọn áo polo đồng phục công ty",
  proposedSlug: "huong-dan-chon-ao-polo-dong-phuc-cong-ty",
  outline: [
    { level: "H1", title: "Hướng dẫn chọn áo polo đồng phục công ty" },
    { level: "H2", title: "Vì sao áo polo phù hợp làm đồng phục công ty?" },
    { level: "H2", title: "Các tiêu chí cần xem xét khi chọn áo polo đồng phục" },
    { level: "H3", title: "Môi trường sử dụng" },
    { level: "H3", title: "Form dáng và đối tượng mặc" },
    { level: "H3", title: "Chất liệu và định lượng vải" },
    { level: "H3", title: "Màu sắc thương hiệu" },
    { level: "H2", title: "Nên chọn chất liệu nào?" },
    { level: "H2", title: "Nên in hay thêu logo?" },
    { level: "H2", title: "Quy trình đặt áo polo đồng phục" },
    { level: "H2", title: "Những lỗi doanh nghiệp nên tránh" },
    { level: "H2", title: "Câu hỏi thường gặp" },
    { level: "H2", title: "Yêu cầu tư vấn và báo giá" },
  ],
  notes: [
    "Template chỉ là gợi ý biên tập — Brief phải được human review/approve.",
    "Không chèn MOQ, lead time hoặc giá chính xác trừ khi Retrieval cung cấp fact đã duyệt.",
    "Không tuyên bố ATTD sở hữu xưởng may may toàn quy trình trừ khi KB công khai đã duyệt khẳng định.",
    "Mô hình thực tế: ATTD có thể nguồn hàng / điều phối sản xuất; không bịa capacity hoặc chứng nhận.",
  ],
} as const;

/** Domains recommended for the polo launch article. */
export const CONTENT_LAUNCH_KNOWLEDGE_DOMAINS = [
  { key: "product_definition", label: "Định nghĩa sản phẩm", required: true, terms: ["áo polo", "polo"] },
  {
    key: "use_case_corporate",
    label: "Use case: đồng phục công ty",
    required: true,
    terms: ["đồng phục công ty", "đồng phục doanh nghiệp", "corporate"],
  },
  {
    key: "audience_business",
    label: "Đối tượng: doanh nghiệp",
    required: true,
    terms: ["doanh nghiệp", "công ty", "B2B"],
  },
  { key: "material", label: "Chất liệu", required: true, terms: ["chất liệu", "vải", "cotton", "cvc", "tc"] },
  {
    key: "print_embroidery",
    label: "In / thêu",
    required: true,
    terms: ["in logo", "thêu", "in ấn", "embroidery"],
  },
  { key: "order_process", label: "Quy trình đặt hàng", required: true, terms: ["quy trình", "đặt hàng", "RFQ"] },
  { key: "moq", label: "Chính sách MOQ", required: false, terms: ["MOQ", "số lượng tối thiểu"] },
  { key: "lead_time", label: "Lead time", required: false, terms: ["lead time", "thời gian giao"] },
  { key: "quality", label: "Hướng dẫn chất lượng", required: false, terms: ["chất lượng", "QC"] },
  { key: "cta", label: "CTA / báo giá", required: true, terms: ["báo giá", "tư vấn", "CTA"] },
  { key: "brand_voice", label: "Brand voice", required: false, terms: ["ATTD", "thương hiệu", "brand"] },
] as const;

export const CONTENT_LAUNCH_FACT_POLICY = {
  allowed: [
    "general product-selection advice",
    "material comparison where supported by approved facts",
    "print/embroidery guidance where supported",
    "procurement/process guidance",
    "B2B CTA",
  ],
  notAllowedWithoutEvidence: [
    "Top 1 / tốt nhất",
    "factory ownership",
    "certifications",
    "named customer endorsements",
    "exact capacity",
    "guaranteed lead time",
    "guaranteed lowest price",
    "sustainability claims",
    "exact MOQ when conflicting or absent",
  ],
  hardBlockers: [
    "unresolved critical numeric conflict intended for use",
    "confidential leakage",
    "no usable public facts",
    "unsupported factory/certification claim",
  ],
} as const;

export const CONTENT_LAUNCH_QA_CHECKS = [
  "H1 and heading hierarchy",
  "no unsupported claims",
  "required fact IDs",
  "numeric fact accuracy",
  "safe links",
  "public media only",
  "image alt text",
  "CTA",
  "meta title",
  "meta description",
  "slug",
  "internal links",
  "FAQ validity",
  "schema validity",
  "no duplicate H1",
  "no script/base64",
] as const;

export const CONTENT_LAUNCH_WORKFLOW_STEPS = [
  { id: "topic", label: "Topic", actionLabel: "Tạo Topic", hrefHint: "/admin/content/seo-topics" },
  { id: "brief", label: "Brief", actionLabel: "Mở Brief", hrefHint: null },
  { id: "context", label: "Context", actionLabel: "Xây dựng Context", hrefHint: null },
  { id: "writing_plan", label: "Writing Plan", actionLabel: "Tạo Writing Plan", hrefHint: null },
  { id: "draft", label: "Draft", actionLabel: "Tạo Draft", hrefHint: null },
  { id: "generation", label: "Generation", actionLabel: "Sinh nội dung", hrefHint: null },
  { id: "qa", label: "QA", actionLabel: "Chạy QA", hrefHint: null },
  { id: "review", label: "Review", actionLabel: "Bắt đầu kiểm duyệt", hrefHint: "/admin/content/reviews" },
  { id: "blog_handoff", label: "Blog handoff", actionLabel: "Tạo Blog Draft", hrefHint: null },
  { id: "publish_readiness", label: "Publish readiness", actionLabel: "Kiểm tra xuất bản", hrefHint: null },
  { id: "published", label: "Published", actionLabel: "Mở Blog editor", hrefHint: "/admin/blog" },
] as const;

export type ContentLaunchWorkflowStepId =
  (typeof CONTENT_LAUNCH_WORKFLOW_STEPS)[number]["id"];
