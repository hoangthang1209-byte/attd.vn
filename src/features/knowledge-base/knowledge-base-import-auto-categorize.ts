import type { KnowledgeBaseEntryType } from "@prisma/client";
import { DEFAULT_KNOWLEDGE_CATEGORIES } from "@/features/knowledge-base/knowledge-base-seed";

const TYPE_KEYWORDS: Array<{ type: KnowledgeBaseEntryType; patterns: RegExp[] }> = [
  {
    type: "FAQ",
    patterns: [/\bfaq\b/i, /câu hỏi thường gặp/i, /hỏi đáp/i],
  },
  {
    type: "POLICY",
    patterns: [/chính sách/i, /\bpolicy\b/i, /quy định/i, /điều khoản/i],
  },
  {
    type: "DEALER",
    patterns: [/đại lý/i, /\bdealer\b/i, /hợp tác đại lý/i, /nguồn hàng/i],
  },
  {
    type: "OEM",
    patterns: [/\boem\b/i, /sản xuất theo yêu cầu/i, /\bmoq\b/i, /private label/i],
  },
  {
    type: "LOGISTICS",
    patterns: [/giao hàng/i, /logistics/i, /vận chuyển/i, /ship/i],
  },
  {
    type: "PRICING",
    patterns: [/bảng giá/i, /pricing/i, /giá bán/i],
  },
  {
    type: "BRAND_VOICE",
    patterns: [/brand voice/i, /giọng thương hiệu/i, /tone of voice/i],
  },
  {
    type: "CASE_STUDY",
    patterns: [/case study/i, /dự án khách/i, /khách hàng tiêu biểu/i],
  },
  {
    type: "MATERIAL",
    patterns: [/chất liệu/i, /\bcvc\b/i, /\bcotton\b/i, /vải /i, /poly/i],
  },
  {
    type: "PRODUCT",
    patterns: [/áo polo/i, /áo thun/i, /sản phẩm/i, /product/i, /form dáng/i],
  },
  {
    type: "MANUFACTURING",
    patterns: [/sản xuất/i, /manufacturing/i, /xưởng may/i],
  },
  {
    type: "COMPANY",
    patterns: [/công ty/i, /attd/i, /thương hiệu/i, /giới thiệu/i],
  },
];

const CATEGORY_KEYWORDS: Array<{ slug: string; patterns: RegExp[] }> = [
  { slug: "faq-advisory", patterns: [/\bfaq\b/i, /câu hỏi/i, /tư vấn/i] },
  { slug: "policies-processes", patterns: [/chính sách/i, /quy trình/i, /giao hàng/i] },
  { slug: "wholesale-dealer", patterns: [/đại lý/i, /bán sỉ/i, /nguồn hàng/i] },
  { slug: "manufacturing-oem", patterns: [/\boem\b/i, /sản xuất/i, /\bmoq\b/i] },
  { slug: "products-materials", patterns: [/sản phẩm/i, /chất liệu/i, /áo thun/i, /áo polo/i] },
  { slug: "case-studies", patterns: [/case study/i, /dự án/i, /khách hàng/i] },
  { slug: "brand-seo", patterns: [/brand voice/i, /seo/i, /giọng thương hiệu/i] },
  { slug: "company", patterns: [/công ty/i, /attd/i, /giới thiệu/i] },
];

export function detectEntryTypeFromText(text: string): KnowledgeBaseEntryType | null {
  const blob = text.toLowerCase();
  for (const rule of TYPE_KEYWORDS) {
    if (rule.patterns.some((p) => p.test(blob))) {
      return rule.type;
    }
  }
  return null;
}

export function detectCategorySlugFromText(text: string): string | null {
  const blob = text.toLowerCase();
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.patterns.some((p) => p.test(blob))) {
      return rule.slug;
    }
  }
  return null;
}

export function resolveCategorySlugFromName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  const match = DEFAULT_KNOWLEDGE_CATEGORIES.find(
    (cat) =>
      cat.name.toLowerCase() === normalized ||
      cat.slug.toLowerCase() === normalized ||
      cat.name.toLowerCase().includes(normalized) ||
      normalized.includes(cat.slug)
  );
  return match?.slug ?? null;
}

export function defaultUsageScopesForType(type: KnowledgeBaseEntryType): string[] {
  switch (type) {
    case "PRODUCT":
    case "MATERIAL":
      return ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"];
    case "OEM":
    case "MANUFACTURING":
      return ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"];
    case "DEALER":
    case "WHOLESALE":
      return ["BLOG_AI", "SALES", "DEALER_PORTAL"];
    case "POLICY":
    case "LOGISTICS":
    case "PRICING":
      return ["BLOG_AI", "CRM", "SALES"];
    case "FAQ":
      return ["BLOG_AI", "PUBLIC_FAQ", "SALES"];
    case "BRAND_VOICE":
    case "SEO_CONTEXT":
      return ["BLOG_AI", "LANDING_PAGE_AI", "PRODUCT_AI"];
    case "CASE_STUDY":
      return ["BLOG_AI", "LANDING_PAGE_AI", "SALES"];
    default:
      return ["BLOG_AI", "INTERNAL_ONLY"];
  }
}
