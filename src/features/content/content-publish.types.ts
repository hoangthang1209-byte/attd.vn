import { createHash } from "node:crypto";

export type ContentPublishAction =
  | "PUBLISH_NOW"
  | "SCHEDULE"
  | "RESCHEDULE"
  | "CANCEL_SCHEDULE"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "RESTORE_DRAFT";

export type ContentPublishEventStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type ContentPublishReadinessChecks = {
  statusEligible: boolean;
  sourceApproved: boolean;
  handoffCompleted: boolean;
  draftVersionMatches: boolean;
  reviewStillValid: boolean;
  contentAcknowledged: boolean;
  titleValid: boolean;
  slugValid: boolean;
  seoMetadataValid: boolean;
  contentValid: boolean;
  faqValid: boolean;
  mediaValid: boolean;
  internalLinksValid: boolean;
  schemaValid: boolean;
  canonicalValid: boolean;
  publicVisibilityValid: boolean;
};

export type ContentPublishReadiness = {
  ready: boolean;
  blogPostId: string;
  governed: boolean;
  sourceWritingDraftId?: string | null;
  sourceDraftVersion?: number | null;
  approvedReviewSessionId?: string | null;
  handoffRecordId?: string | null;
  contentHash: string;
  sourceSnapshotHash?: string | null;
  materiallyChangedAfterHandoff: boolean;
  checks: ContentPublishReadinessChecks;
  errors: string[];
  warnings: string[];
};

export type BlogContentHashInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  faqJson?: unknown;
  featuredImageUrl?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  tags?: unknown;
};

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "portal",
  "new",
  "categories",
  "danh-muc",
  "rss",
  "sitemap",
]);

export function normalizePublishText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function hashBlogPublicContent(input: BlogContentHashInput): string {
  const payload = {
    title: normalizePublishText(input.title),
    slug: normalizePublishText(input.slug),
    excerpt: normalizePublishText(input.excerpt),
    content: normalizePublishText(input.content),
    metaTitle: normalizePublishText(input.metaTitle),
    metaDescription: normalizePublishText(input.metaDescription),
    faqJson: input.faqJson ?? [],
    featuredImageUrl: normalizePublishText(input.featuredImageUrl),
    ogImageUrl: normalizePublishText(input.ogImageUrl),
    canonicalUrl: normalizePublishText(input.canonicalUrl),
    tags: input.tags ?? [],
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildPublishIdempotencyHash(input: {
  blogPostId: string;
  action: string;
  contentHash: string;
  sourceVersion?: number | null;
  scheduledFor?: string | null;
  actorId?: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function isReservedBlogSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function validateBlogSlugShape(slug: string): string | null {
  const s = slug.trim();
  if (!s) return "Slug bắt buộc";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
    return "Slug chỉ gồm chữ thường, số và dấu gạch ngang";
  }
  if (isReservedBlogSlug(s)) return `Slug "${s}" bị reserved`;
  return null;
}

export function detectFactualOrNumericDrift(before: string, after: string): boolean {
  const extract = (t: string) =>
    [...t.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => m[1].replace(",", "."));
  const a = new Set(extract(before));
  const b = new Set(extract(after));
  for (const n of a) if (!b.has(n)) return true;
  for (const n of b) if (!a.has(n)) return true;
  return false;
}

export function validatePublicContentLinks(html: string | null | undefined): string[] {
  if (!html) return [];
  const errors: string[] = [];
  const hrefs = [...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    const lower = href.trim().toLowerCase();
    if (!lower) continue;
    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
      errors.push(`Link không an toàn: ${href.slice(0, 60)}`);
      continue;
    }
    if (lower.startsWith("/admin") || lower.includes("/admin/")) {
      errors.push("Không được nhúng URL admin trong nội dung công khai");
    }
  }
  return errors;
}

export function validateCanonicalUrl(canonical: string | null | undefined): string | null {
  if (!canonical?.trim()) return null;
  const value = canonical.trim();
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "Canonical phải dùng http/https";
    if (url.pathname.startsWith("/admin")) return "Canonical không được trỏ tới admin";
    return null;
  } catch {
    if (value.startsWith("/")) {
      if (value.startsWith("/admin")) return "Canonical không được trỏ tới admin";
      return null;
    }
    return "Canonical URL không hợp lệ";
  }
}

export function emptyPublishChecks(overrides: Partial<ContentPublishReadinessChecks> = {}): ContentPublishReadinessChecks {
  return {
    statusEligible: false,
    sourceApproved: false,
    handoffCompleted: false,
    draftVersionMatches: false,
    reviewStillValid: false,
    contentAcknowledged: false,
    titleValid: false,
    slugValid: false,
    seoMetadataValid: false,
    contentValid: false,
    faqValid: true,
    mediaValid: true,
    internalLinksValid: true,
    schemaValid: true,
    canonicalValid: true,
    publicVisibilityValid: true,
    ...overrides,
  };
}

export type PublishContentTargetType = "BLOG_POST" | "LANDING_PAGE" | "CASE_STUDY" | "KNOWLEDGE_BASE";

export function assertSupportedPublishTarget(targetType: string): asserts targetType is "BLOG_POST" {
  if (targetType !== "BLOG_POST") {
    throw new Error(`Target type "${targetType}" chưa được hỗ trợ trong sprint này.`);
  }
}
