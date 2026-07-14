import type {
  SeoContentType,
  SeoFunnelStage,
  SeoKeywordType,
  SeoSearchIntent,
  SeoStrategyStatus,
  SeoTopicPriority,
  SeoTopicStatus,
} from "@prisma/client";

export const SEO_STRATEGY_STATUSES: SeoStrategyStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
];

export const SEO_TOPIC_STATUSES: SeoTopicStatus[] = [
  "IDEA",
  "RESEARCHING",
  "APPROVED",
  "BRIEF_READY",
  "DRAFTING",
  "REVIEW",
  "PUBLISHED",
  "PAUSED",
  "REJECTED",
  "ARCHIVED",
];

export const SEO_SEARCH_INTENTS: SeoSearchIntent[] = [
  "INFORMATIONAL",
  "COMMERCIAL",
  "TRANSACTIONAL",
  "NAVIGATIONAL",
  "LOCAL",
  "MIXED",
];

export const SEO_CONTENT_TYPES: SeoContentType[] = [
  "BLOG_ARTICLE",
  "LANDING_PAGE",
  "CATEGORY_PAGE",
  "PRODUCT_GUIDE",
  "CASE_STUDY",
  "KNOWLEDGE_BASE",
  "COMPARISON",
  "GLOSSARY",
  "FAQ",
  "CAPABILITY_PAGE",
  "DEALER_CONTENT",
  "OTHER",
];

export const SEO_FUNNEL_STAGES: SeoFunnelStage[] = [
  "AWARENESS",
  "CONSIDERATION",
  "DECISION",
  "RETENTION",
];

export const SEO_TOPIC_PRIORITIES: SeoTopicPriority[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

export const SEO_KEYWORD_TYPES: SeoKeywordType[] = [
  "PRIMARY",
  "SECONDARY",
  "LONG_TAIL",
  "QUESTION",
  "ENTITY",
  "SUPPORTING",
  "NEGATIVE",
];

export function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
