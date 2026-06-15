import type { KnowledgeBaseEntryType, KnowledgeBaseEntryStatus, KnowledgeBasePriority } from "@prisma/client";
import type { KnowledgeBaseEntryInput } from "@/features/knowledge-base/knowledge-base-types";
import { generateKnowledgeBaseSlug, normalizeKnowledgeBaseTags } from "@/features/knowledge-base/knowledge-base-utils";

const VALID_TYPES: KnowledgeBaseEntryType[] = [
  "COMPANY", "PRODUCT", "MATERIAL", "MANUFACTURING", "OEM", "WHOLESALE", "DEALER",
  "PRICING", "POLICY", "CASE_STUDY", "FAQ", "SALES_SCRIPT", "SEO_CONTEXT", "BRAND_VOICE",
  "LOGISTICS", "QUALITY_CONTROL", "CUSTOMER_SEGMENT", "COMPETITOR_NOTE",
];

const VALID_STATUSES: KnowledgeBaseEntryStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const VALID_PRIORITIES: KnowledgeBasePriority[] = ["HIGH", "MEDIUM", "LOW"];

export function validateKnowledgeBaseEntry(input: Partial<KnowledgeBaseEntryInput>): {
  valid: boolean;
  errors: string[];
  data?: KnowledgeBaseEntryInput;
} {
  const errors: string[] = [];
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const slug = typeof input.slug === "string" && input.slug.trim()
    ? input.slug.trim()
    : title
      ? generateKnowledgeBaseSlug(title)
      : "";

  if (!title) errors.push("Tiêu đề là bắt buộc.");
  if (!slug) errors.push("Slug là bắt buộc.");
  if (!input.categoryId) errors.push("Danh mục là bắt buộc.");
  if (!input.type || !VALID_TYPES.includes(input.type)) errors.push("Loại dữ liệu không hợp lệ.");

  if (input.status && !VALID_STATUSES.includes(input.status)) {
    errors.push("Trạng thái không hợp lệ.");
  }
  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
    errors.push("Mức ưu tiên không hợp lệ.");
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      title,
      slug,
      summary: input.summary ?? null,
      content: input.content ?? null,
      structuredData: input.structuredData ?? null,
      categoryId: input.categoryId!,
      type: input.type!,
      status: input.status ?? "DRAFT",
      priority: input.priority ?? "MEDIUM",
      sourceId: input.sourceId ?? null,
      tags: normalizeKnowledgeBaseTags(input.tags),
      relatedProductIds: input.relatedProductIds ?? [],
      relatedLandingPageSlugs: input.relatedLandingPageSlugs ?? [],
      relatedBlogPostIds: input.relatedBlogPostIds ?? [],
      usageScope: input.usageScope ?? [],
      isFeatured: input.isFeatured ?? false,
      isVerified: input.isVerified ?? false,
    },
  };
}
