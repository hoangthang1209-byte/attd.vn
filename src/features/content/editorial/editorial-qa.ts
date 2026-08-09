/**
 * Lightweight deterministic editorial QA for Solo Founder revenue drafts.
 * Aligns claim checks with publish readiness; does NOT invent a second scoring framework.
 */

import { extractInlineMediaIdsFromHtml } from "@/features/content/inline-media/inline-media-figure";
import { validatePublicContentLinks } from "@/features/content/content-publish.types";

export type EditorialQaCheckId =
  | "content"
  | "claims"
  | "seo"
  | "links"
  | "media"
  | "cta";

export type EditorialQaCheck = {
  id: EditorialQaCheckId;
  label: string;
  ok: boolean;
  warnings: string[];
};

export type EditorialQaInput = {
  title?: string | null;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  faqCount?: number;
  expectedInlineMediaIds?: string[];
  requireFaq?: boolean;
};

export type EditorialQaResult = {
  readyForReview: boolean;
  checks: EditorialQaCheck[];
  warnings: string[];
  details: string[];
};

const AI_FILLER_PATTERNS: RegExp[] = [
  /Trong bối cảnh thị trường/i,
  /Ngày nay,\s*việc lựa chọn/i,
  /Không thể phủ nhận rằng/i,
  /Trong thế giới thời trang hiện đại/i,
  /đóng vai trò vô cùng quan trọng/i,
];

const INTERNAL_DEBUG_PATTERNS: RegExp[] = [
  /\bHub:\s*/i,
  /\bCatalogue:\s*/i,
  /Chọn nguồn tổng:/i,
  /Hub mua sỉ:/i,
  /Checklist chọn nguồn tổng:/i,
  /Chất liệu:\s*<a/i,
  /Danh mục:\s*<a/i,
  /prompt\s*id/i,
  /context\s*package/i,
  /factIdsUsed/i,
  /writing-draft/i,
  /CMS\s*instruction/i,
];

/** Align with publish readiness: numeric unsupported commercial claims. */
const UNSUPPORTED_CLAIM_PATTERNS: Array<{ code: string; pattern: RegExp; message: string }> = [
  { code: "MOQ_NUMBER", pattern: /\bMOQ\s*[:=]?\s*\d+/i, message: "MOQ số cụ thể chưa có evidence." },
  { code: "PRICE", pattern: /giá\s*(chỉ\s*)?từ\s*[\d.,]+\s*(đ|vnd|k)/i, message: "Giá cụ thể chưa có evidence." },
  { code: "LEAD_TIME", pattern: /giao trong\s*\d+\s*-\s*\d+\s*ngày/i, message: "Lead time cụ thể chưa có evidence." },
  { code: "PARTNERS", pattern: /hơn\s*\d+\s*đối tác/i, message: "Số đối tác chưa có evidence." },
  { code: "DISCOUNT", pattern: /chiết khấu\s*\d+/i, message: "Chiết khấu cụ thể chưa có evidence." },
];

/** Catch obvious accidental repeats; allow legitimate doubles like “song song”. */
const DUPLICATE_WORD =
  /\b(form|áo|size|màu|mẫu|vải|in|thêu|regular|oversize)\s+\1\b/iu;
const UNFINISHED = /≥\s*phần lớn/;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    // Keep block boundaries so heading+next-paragraph do not look like “Thêu Thêu”.
    .replace(/<\/(p|h[1-6]|li|td|th|div|section|aside|figcaption|blockquote)>/gi, "\n")
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function hasCta(html: string): boolean {
  if (/blog-cta-block/i.test(html)) return true;
  return /href=["']\/(lien-he|bao-gia|contact)/i.test(html);
}

function blankTerminologyHits(text: string): boolean {
  const withoutAttrs = text.replace(/\btarget=["']_blank["']/gi, " ");
  return /\bblank\b/i.test(withoutAttrs);
}

/**
 * Deterministic Solo editorial checklist after generation / before human review.
 */
export function runEditorialQa(input: EditorialQaInput): EditorialQaResult {
  const html = input.content ?? "";
  const text = stripHtml(html);
  const details: string[] = [];
  const warnings: string[] = [];

  const contentWarnings: string[] = [];
  if (!text || text.length < 80) {
    contentWarnings.push("Nội dung quá ngắn hoặc trống.");
    details.push("CONTENT_EMPTY");
  }
  for (const pattern of AI_FILLER_PATTERNS) {
    if (pattern.test(text)) {
      contentWarnings.push("Phát hiện câu mở đầu/filler AI generic.");
      details.push("AI_FILLER");
      break;
    }
  }
  for (const pattern of INTERNAL_DEBUG_PATTERNS) {
    if (pattern.test(html) || pattern.test(text)) {
      contentWarnings.push("Phát hiện ngôn ngữ nội bộ/debug trong bài.");
      details.push("INTERNAL_DEBUG_PROSE");
      break;
    }
  }
  if (DUPLICATE_WORD.test(text.replace(/\n/g, " "))) {
    // Still scan flattened text, but prefer line-local matches to reduce heading bleed.
    const lineHit = text.split("\n").some((line) => DUPLICATE_WORD.test(line));
    if (lineHit) {
      contentWarnings.push("Phát hiện từ lặp (vd. “form form”).");
      details.push("DUPLICATE_WORD");
    }
  }
  if (UNFINISHED.test(text)) {
    contentWarnings.push("Phát hiện diễn đạt chưa hoàn chỉnh.");
    details.push("UNFINISHED_PHRASE");
  }
  if (blankTerminologyHits(html) || blankTerminologyHits(text)) {
    contentWarnings.push("Không dùng “blank” cho áo trơn trên bản công khai.");
    details.push("BLANK_TERMINOLOGY");
  }

  const claimWarnings: string[] = [];
  for (const rule of UNSUPPORTED_CLAIM_PATTERNS) {
    if (rule.pattern.test(text) || rule.pattern.test(html)) {
      claimWarnings.push(rule.message);
      details.push(`CLAIM_${rule.code}`);
    }
  }

  const seoWarnings: string[] = [];
  if (!input.title?.trim() && !input.metaTitle?.trim()) {
    seoWarnings.push("Thiếu tiêu đề / meta title.");
    details.push("SEO_TITLE");
  }
  if (!input.metaDescription?.trim()) {
    seoWarnings.push("Thiếu meta description.");
    details.push("SEO_META_DESCRIPTION");
  } else if (input.metaDescription.trim().length < 50) {
    seoWarnings.push("Meta description khá ngắn.");
    details.push("SEO_META_SHORT");
  }
  if (!input.canonicalUrl?.trim()) {
    seoWarnings.push("Thiếu canonical (sẽ tự điền self-canonical khi lưu nếu trống).");
    details.push("SEO_CANONICAL");
  }
  if ((input.faqCount ?? 0) < 1 && input.requireFaq !== false) {
    seoWarnings.push("Nên có FAQ khi bài trả lời câu hỏi sourcing.");
    details.push("SEO_FAQ");
  }

  const linkErrors = validatePublicContentLinks(html);
  const linkWarnings = [...linkErrors];
  if (linkErrors.length) details.push("INVALID_INTERNAL_LINK");

  const mediaWarnings: string[] = [];
  const imgCount = (html.match(/<img\b/gi) || []).length;
  const mediaIds = extractInlineMediaIdsFromHtml(html);
  if (imgCount === 0) {
    mediaWarnings.push("Chưa có ảnh trong nội dung.");
    details.push("MEDIA_MISSING");
  }
  if (imgCount > 0 && mediaIds.length === 0) {
    mediaWarnings.push("Ảnh body thiếu data-media-id — chưa gắn ContentMediaAssignment SoT.");
    details.push("MEDIA_UNSTRUCTURED");
  }
  if (mediaIds.length > 0 && mediaIds.length !== imgCount) {
    mediaWarnings.push("Số ảnh và data-media-id không khớp.");
    details.push("MEDIA_COUNT_MISMATCH");
  }
  if (input.expectedInlineMediaIds?.length) {
    for (const id of input.expectedInlineMediaIds) {
      if (!mediaIds.includes(id)) {
        mediaWarnings.push(`Thiếu media assignment/figure cho asset ${id}.`);
        details.push("MEDIA_EXPECTED_MISSING");
      }
    }
  }

  const ctaWarnings: string[] = [];
  if (!hasCta(html)) {
    ctaWarnings.push("Thiếu CTA thương mại (/lien-he hoặc khối CTA).");
    details.push("CTA_MISSING");
  }

  const checks: EditorialQaCheck[] = [
    {
      id: "content",
      label: "Nội dung",
      ok: contentWarnings.length === 0,
      warnings: contentWarnings,
    },
    {
      id: "claims",
      label: "Thông tin",
      ok: claimWarnings.length === 0,
      warnings: claimWarnings,
    },
    {
      id: "seo",
      label: "SEO",
      ok: Boolean(input.metaTitle?.trim() || input.title?.trim()) && Boolean(input.metaDescription?.trim()),
      warnings: seoWarnings,
    },
    {
      id: "links",
      label: "Liên kết",
      ok: linkWarnings.length === 0,
      warnings: linkWarnings,
    },
    {
      id: "media",
      label: "Hình ảnh",
      ok:
        imgCount > 0 &&
        !details.includes("MEDIA_UNSTRUCTURED") &&
        !details.includes("MEDIA_COUNT_MISMATCH") &&
        !details.includes("MEDIA_EXPECTED_MISSING"),
      warnings: mediaWarnings,
    },
    {
      id: "cta",
      label: "CTA",
      ok: ctaWarnings.length === 0,
      warnings: ctaWarnings,
    },
  ];

  for (const check of checks) warnings.push(...check.warnings);

  const blocking = checks.filter((c) => !c.ok && (c.id === "content" || c.id === "claims" || c.id === "links"));
  const readyForReview =
    blocking.length === 0 &&
    checks.find((c) => c.id === "seo")?.ok === true &&
    checks.find((c) => c.id === "cta")?.ok === true;

  return { readyForReview, checks, warnings, details };
}

export function formatEditorialQaChecklist(result: EditorialQaResult): string {
  return result.checks
    .map((c) => `${c.ok ? "✓" : "!"} ${c.label}${c.warnings.length ? ` — ${c.warnings[0]}` : ""}`)
    .join("\n");
}
