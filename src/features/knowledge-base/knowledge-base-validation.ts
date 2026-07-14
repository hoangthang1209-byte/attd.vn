import type {
  KnowledgeBaseClaimStatus,
  KnowledgeBaseConfidence,
  KnowledgeBaseEntryType,
  KnowledgeBaseEntryStatus,
  KnowledgeBasePriority,
  KnowledgeBaseVisibility,
} from "@prisma/client";
import type { KnowledgeBaseEntryInput } from "@/features/knowledge-base/knowledge-base-types";
import { generateKnowledgeBaseSlug, normalizeKnowledgeBaseTags } from "@/features/knowledge-base/knowledge-base-utils";
import { normalizeStructuredData } from "@/features/knowledge-base/knowledge-base-structured-schema";
import { inferVisibilityFromUsageScope } from "@/features/knowledge-base/knowledge-base-visibility";
import { resolveClaimStatusOnVerify } from "@/features/knowledge-base/knowledge-base-claim-governance";

const VALID_TYPES: KnowledgeBaseEntryType[] = [
  "COMPANY", "PRODUCT", "MATERIAL", "MANUFACTURING", "OEM", "WHOLESALE", "DEALER",
  "PRICING", "POLICY", "CASE_STUDY", "FAQ", "SALES_SCRIPT", "SEO_CONTEXT", "BRAND_VOICE",
  "LOGISTICS", "QUALITY_CONTROL", "CUSTOMER_SEGMENT", "COMPETITOR_NOTE",
];

const VALID_STATUSES: KnowledgeBaseEntryStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const VALID_PRIORITIES: KnowledgeBasePriority[] = ["HIGH", "MEDIUM", "LOW"];
const VALID_VISIBILITY: KnowledgeBaseVisibility[] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL"];
const VALID_CLAIMS: KnowledgeBaseClaimStatus[] = [
  "FACT", "OPINION", "MARKETING_CLAIM", "VERIFIED_CLAIM", "NEEDS_EVIDENCE",
];
const VALID_CONFIDENCE: KnowledgeBaseConfidence[] = ["LOW", "MEDIUM", "HIGH"];

function normalizeAliases(value: string[] | string | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : value.split(",");
  return [...new Set(list.map((item) => item.trim()).filter(Boolean))];
}

function normalizeIdList(value: string[] | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.map((id) => id.trim()).filter(Boolean))];
}

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
  if (input.visibility && !VALID_VISIBILITY.includes(input.visibility)) {
    errors.push("Visibility không hợp lệ.");
  }
  if (input.claimStatus && !VALID_CLAIMS.includes(input.claimStatus)) {
    errors.push("Claim status không hợp lệ.");
  }
  if (input.confidence && !VALID_CONFIDENCE.includes(input.confidence)) {
    errors.push("Confidence không hợp lệ.");
  }

  const usageScope = input.usageScope ?? [];
  const visibility =
    input.visibility ?? inferVisibilityFromUsageScope(usageScope);
  const isVerified = input.isVerified ?? false;
  const claimStatus = resolveClaimStatusOnVerify({
    claimStatus: input.claimStatus ?? "FACT",
    evidenceUrl: input.evidenceUrl,
    isVerified,
  });

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      title,
      slug,
      summary: input.summary ?? null,
      content: input.content ?? null,
      structuredData: normalizeStructuredData(input.structuredData ?? null),
      categoryId: input.categoryId!,
      type: input.type!,
      status: input.status ?? "DRAFT",
      priority: input.priority ?? "MEDIUM",
      sourceId: input.sourceId ?? null,
      tags: normalizeKnowledgeBaseTags(input.tags),
      aliases: normalizeAliases(input.aliases),
      relatedProductIds: normalizeIdList(input.relatedProductIds),
      relatedLandingPageSlugs: normalizeIdList(input.relatedLandingPageSlugs),
      relatedBlogPostIds: normalizeIdList(input.relatedBlogPostIds),
      relatedMediaBundleIds: normalizeIdList(input.relatedMediaBundleIds),
      relatedSeoTopicIds: normalizeIdList(input.relatedSeoTopicIds),
      relatedEntryIds: normalizeIdList(input.relatedEntryIds),
      usageScope,
      visibility,
      claimStatus,
      confidence: input.confidence ?? "MEDIUM",
      language: input.language?.trim() || "vi",
      domain: input.domain?.trim() || null,
      ownerId: input.ownerId?.trim() || null,
      authorName: input.authorName?.trim() || null,
      evidenceUrl: input.evidenceUrl?.trim() || null,
      reviewIntervalDays:
        typeof input.reviewIntervalDays === "number" && Number.isFinite(input.reviewIntervalDays)
          ? Math.max(0, Math.floor(input.reviewIntervalDays))
          : input.reviewIntervalDays === null
            ? null
            : undefined,
      nextReviewAt: parseOptionalDate(input.nextReviewAt),
      expiresAt: parseOptionalDate(input.expiresAt),
      isFeatured: input.isFeatured ?? false,
      isVerified,
    },
  };
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return undefined;
}
