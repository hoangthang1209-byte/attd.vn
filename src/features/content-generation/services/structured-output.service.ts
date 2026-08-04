import {
  plainTextFromHtml,
  sanitizeWritingSectionHtml,
} from "@/features/writing-engine/services/writing-section-sanitize.service";
import { countWords } from "@/features/writing-engine/writing-utils";
import {
  ContentGenerationError,
  type AltCaptionResult,
  type BriefOutlineItem,
  type BriefResult,
  type ContentGenerationType,
  type CtaResult,
  type FaqResult,
  type GovernedGenerationContext,
  type LinkSuggestionResult,
  type MediaSuggestionResult,
  type MetaResult,
  type OutlineResult,
  type SectionResult,
} from "@/features/content-generation/contracts/generation.types";
import { assertSafeProposalText } from "@/features/content-generation/services/claim-safety.service";

const MAX_META_TITLE = 120;
const MAX_META_DESCRIPTION = 400;
const MAX_SHORT_TEXT = 200;

function asRecord(raw: unknown, message: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContentGenerationError(message, "INVALID_PROVIDER_OUTPUT");
  }
  return raw as Record<string, unknown>;
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function asOptionalString(raw: unknown, max: number): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  return raw.trim().slice(0, max) || null;
}

function factIdSet(context: GovernedGenerationContext): Set<string> {
  return new Set(context.facts.map((f) => f.factId));
}

function mediaIdSet(context: GovernedGenerationContext): Set<string> {
  return new Set(context.media.map((m) => m.id));
}

function linkUrlSet(context: GovernedGenerationContext): Set<string> {
  return new Set(context.links.map((l) => l.url));
}

function assertFactIdsAllowed(factIds: string[], allowed: Set<string>): void {
  const invalid = factIds.filter((id) => !allowed.has(id));
  if (invalid.length > 0) {
    throw new ContentGenerationError(
      `Fact ID không có trong ngữ cảnh được duyệt: ${invalid.join(", ")}`,
      "FACT_NOT_ALLOWED",
    );
  }
}

function assertMediaIdsAllowed(mediaIds: string[], allowed: Set<string>): void {
  const invalid = mediaIds.filter((id) => !allowed.has(id));
  if (invalid.length > 0) {
    throw new ContentGenerationError(
      `Media asset không có trong ngữ cảnh được duyệt: ${invalid.join(", ")}`,
      "MEDIA_NOT_ALLOWED",
    );
  }
}

function assertLinkUrlsAllowed(urls: string[], allowed: Set<string>): void {
  const invalid = urls.filter((url) => !allowed.has(url));
  if (invalid.length > 0) {
    throw new ContentGenerationError(
      `Liên kết không có trong ngữ cảnh được duyệt: ${invalid.join(", ")}`,
      "LINK_NOT_VALID",
    );
  }
}

function parseOutlineItems(raw: unknown): BriefOutlineItem[] {
  if (!Array.isArray(raw)) {
    throw new ContentGenerationError("outline phải là mảng.", "INVALID_PROVIDER_OUTPUT");
  }
  return raw.map((item, index) => {
    const row = asRecord(item, `outline[${index}] không hợp lệ.`);
    const heading = typeof row.heading === "string" ? sanitizeWritingSectionHtml(row.heading).trim() : "";
    if (!heading) {
      throw new ContentGenerationError(`outline[${index}] thiếu heading.`, "INVALID_PROVIDER_OUTPUT");
    }
    return {
      level: row.level === "H3" ? "H3" : "H2",
      heading,
      purpose: typeof row.purpose === "string" ? row.purpose.trim().slice(0, MAX_SHORT_TEXT) : null,
      required: row.required === true,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    };
  });
}

export function validateSectionResult(raw: unknown, context: GovernedGenerationContext): SectionResult {
  const row = asRecord(raw, "Kết quả section không đúng định dạng.");
  const sectionId = typeof row.sectionId === "string" && row.sectionId ? row.sectionId : context.section?.id ?? "";
  const heading = typeof row.heading === "string" ? row.heading.trim() : context.section?.heading ?? "";
  if (!heading) {
    throw new ContentGenerationError("Section thiếu heading.", "INVALID_PROVIDER_OUTPUT");
  }

  const html = sanitizeWritingSectionHtml(typeof row.html === "string" ? row.html : "");
  if (!html.trim()) {
    throw new ContentGenerationError("Section không có nội dung html.", "INVALID_PROVIDER_OUTPUT");
  }
  const plainText = typeof row.plainText === "string" && row.plainText.trim() ? row.plainText.trim() : plainTextFromHtml(html);

  const factIdsUsed = asStringArray(row.factIdsUsed);
  const mediaIdsUsed = asStringArray(row.mediaIdsUsed);
  const internalLinkIdsUsed = asStringArray(row.internalLinkIdsUsed);

  assertFactIdsAllowed(factIdsUsed, factIdSet(context));
  assertMediaIdsAllowed(mediaIdsUsed, mediaIdSet(context));

  const allowedLinkIds = new Set(context.links.map((l) => l.id));
  const invalidLinkIds = internalLinkIdsUsed.filter((id) => !allowedLinkIds.has(id));
  if (invalidLinkIds.length > 0) {
    throw new ContentGenerationError(
      `Liên kết không có trong ngữ cảnh được duyệt: ${invalidLinkIds.join(", ")}`,
      "LINK_NOT_VALID",
    );
  }

  assertSafeProposalText(plainText, factIdsUsed, [...factIdSet(context)]);

  const wordCount = typeof row.wordCount === "number" && row.wordCount > 0 ? row.wordCount : countWords(plainText);

  return {
    sectionId,
    heading,
    html,
    plainText,
    factIdsUsed,
    mediaIdsUsed,
    internalLinkIdsUsed,
    wordCount,
    warnings: asStringArray(row.warnings),
  };
}

export function validateBriefResult(raw: unknown, context: GovernedGenerationContext): BriefResult {
  const row = asRecord(raw, "Kết quả brief không đúng định dạng.");
  const outline = parseOutlineItems(row.outline ?? []);
  const factIdsUsed = asStringArray(row.factIdsUsed);
  assertFactIdsAllowed(factIdsUsed, factIdSet(context));

  const valueProposition = asOptionalString(row.valueProposition, 600);
  const audienceNotes = asOptionalString(row.audienceNotes, 600);
  if (valueProposition) assertSafeProposalText(valueProposition, factIdsUsed, [...factIdSet(context)]);
  if (audienceNotes) assertSafeProposalText(audienceNotes, factIdsUsed, [...factIdSet(context)]);

  return {
    workingTitle: asOptionalString(row.workingTitle, MAX_SHORT_TEXT),
    proposedSlug: asOptionalString(row.proposedSlug, MAX_SHORT_TEXT),
    metaTitle: asOptionalString(row.metaTitle, 80),
    metaDescription: asOptionalString(row.metaDescription, MAX_META_DESCRIPTION),
    audienceNotes,
    valueProposition,
    outline,
    requiredSections: asStringArray(row.requiredSections),
    ctaType: asOptionalString(row.ctaType, 80),
    ctaText: asOptionalString(row.ctaText, MAX_SHORT_TEXT),
    wordCountMin: typeof row.wordCountMin === "number" ? Math.floor(row.wordCountMin) : null,
    wordCountMax: typeof row.wordCountMax === "number" ? Math.floor(row.wordCountMax) : null,
    schemaTypes: asStringArray(row.schemaTypes),
    factIdsUsed,
    warnings: asStringArray(row.warnings),
  };
}

export function validateOutlineResult(raw: unknown): OutlineResult {
  const row = asRecord(raw, "Kết quả outline không đúng định dạng.");
  return {
    outline: parseOutlineItems(row.outline ?? []),
    warnings: asStringArray(row.warnings),
  };
}

export function validateFaqResult(raw: unknown, context: GovernedGenerationContext): FaqResult {
  const row = asRecord(raw, "Kết quả FAQ không đúng định dạng.");
  if (!Array.isArray(row.items)) {
    throw new ContentGenerationError("FAQ items phải là mảng.", "INVALID_PROVIDER_OUTPUT");
  }
  const allowedFacts = factIdSet(context);
  const items = row.items.map((item, index) => {
    const itemRow = asRecord(item, `FAQ item[${index}] không hợp lệ.`);
    const question = typeof itemRow.question === "string" ? itemRow.question.trim() : "";
    if (!question) {
      throw new ContentGenerationError(`FAQ item[${index}] thiếu question.`, "INVALID_PROVIDER_OUTPUT");
    }
    const answerHtml = sanitizeWritingSectionHtml(typeof itemRow.answerHtml === "string" ? itemRow.answerHtml : "");
    const factIdsUsed = asStringArray(itemRow.factIdsUsed);
    assertFactIdsAllowed(factIdsUsed, allowedFacts);
    assertSafeProposalText(plainTextFromHtml(answerHtml), factIdsUsed, [...allowedFacts]);
    return { question, answerHtml, factIdsUsed };
  });

  return { items, warnings: asStringArray(row.warnings) };
}

export function validateMetaResult(raw: unknown): MetaResult {
  const row = asRecord(raw, "Kết quả meta không đúng định dạng.");
  const metaTitle = asOptionalString(row.metaTitle, MAX_META_TITLE);
  const metaDescription = asOptionalString(row.metaDescription, MAX_META_DESCRIPTION);
  if (!metaTitle || !metaDescription) {
    throw new ContentGenerationError("Meta suggestion thiếu metaTitle/metaDescription.", "INVALID_PROVIDER_OUTPUT");
  }
  return { metaTitle, metaDescription, warnings: asStringArray(row.warnings) };
}

export function validateCtaResult(raw: unknown): CtaResult {
  const row = asRecord(raw, "Kết quả CTA không đúng định dạng.");
  const ctaText = asOptionalString(row.ctaText, MAX_SHORT_TEXT);
  if (!ctaText) {
    throw new ContentGenerationError("CTA suggestion thiếu ctaText.", "INVALID_PROVIDER_OUTPUT");
  }
  return {
    ctaType: asOptionalString(row.ctaType, 80) ?? "CONTACT",
    ctaText,
    destination: asOptionalString(row.destination, MAX_SHORT_TEXT),
    warnings: asStringArray(row.warnings),
  };
}

export function validateMediaSuggestionResult(raw: unknown, context: GovernedGenerationContext): MediaSuggestionResult {
  const row = asRecord(raw, "Kết quả media suggestion không đúng định dạng.");
  if (!Array.isArray(row.suggestions)) {
    throw new ContentGenerationError("Media suggestions phải là mảng.", "INVALID_PROVIDER_OUTPUT");
  }
  const allowedMedia = mediaIdSet(context);
  const suggestions = row.suggestions.map((item, index) => {
    const itemRow = asRecord(item, `Media suggestion[${index}] không hợp lệ.`);
    const mediaAssetId = typeof itemRow.mediaAssetId === "string" ? itemRow.mediaAssetId : "";
    assertMediaIdsAllowed([mediaAssetId], allowedMedia);
    return {
      mediaAssetId,
      placement: typeof itemRow.placement === "string" ? itemRow.placement : "INLINE_AFTER",
      altText: asOptionalString(itemRow.altText, MAX_SHORT_TEXT) ?? "",
      caption: asOptionalString(itemRow.caption, MAX_SHORT_TEXT),
      reason: asOptionalString(itemRow.reason, MAX_SHORT_TEXT),
    };
  });
  return { suggestions, warnings: asStringArray(row.warnings) };
}

export function validateLinkSuggestionResult(raw: unknown, context: GovernedGenerationContext): LinkSuggestionResult {
  const row = asRecord(raw, "Kết quả link suggestion không đúng định dạng.");
  if (!Array.isArray(row.suggestions)) {
    throw new ContentGenerationError("Link suggestions phải là mảng.", "INVALID_PROVIDER_OUTPUT");
  }
  const allowedUrls = linkUrlSet(context);
  const suggestions = row.suggestions.map((item, index) => {
    const itemRow = asRecord(item, `Link suggestion[${index}] không hợp lệ.`);
    const url = typeof itemRow.url === "string" ? itemRow.url : "";
    assertLinkUrlsAllowed([url], allowedUrls);
    return {
      url,
      anchorText: asOptionalString(itemRow.anchorText, MAX_SHORT_TEXT) ?? "",
      targetTopicId: asOptionalString(itemRow.targetTopicId, MAX_SHORT_TEXT),
      sectionId: asOptionalString(itemRow.sectionId, MAX_SHORT_TEXT),
      reason: asOptionalString(itemRow.reason, MAX_SHORT_TEXT),
    };
  });
  return { suggestions, warnings: asStringArray(row.warnings) };
}

export function validateAltCaptionResult(raw: unknown, context: GovernedGenerationContext): AltCaptionResult {
  const row = asRecord(raw, "Kết quả alt/caption không đúng định dạng.");
  const mediaAssetId = asOptionalString(row.mediaAssetId, MAX_SHORT_TEXT);
  if (mediaAssetId) {
    assertMediaIdsAllowed([mediaAssetId], mediaIdSet(context));
  }
  const altText = asOptionalString(row.altText, MAX_SHORT_TEXT);
  if (!altText) {
    throw new ContentGenerationError("Alt/caption suggestion thiếu altText.", "INVALID_PROVIDER_OUTPUT");
  }
  return {
    mediaAssetId,
    altText,
    caption: asOptionalString(row.caption, MAX_SHORT_TEXT),
    warnings: asStringArray(row.warnings),
  };
}

const SECTION_TYPES: ContentGenerationType[] = [
  "SECTION_DRAFT",
  "SECTION_REWRITE",
  "SECTION_SHORTEN",
  "SECTION_EXPAND",
  "SECTION_TONE_CHANGE",
  "SECTION_EXAMPLE",
];

/**
 * Dispatches to the per-type validator. Every validator either returns a
 * clean structured object or throws ContentGenerationError with one of:
 * INVALID_PROVIDER_OUTPUT, FACT_NOT_ALLOWED, MEDIA_NOT_ALLOWED,
 * LINK_NOT_VALID, UNSAFE_CLAIM.
 */
export function validateStructuredOutput(
  type: ContentGenerationType,
  raw: unknown,
  context: GovernedGenerationContext,
): unknown {
  if (SECTION_TYPES.includes(type)) return validateSectionResult(raw, context);
  switch (type) {
    case "BRIEF_SUGGESTION":
      return validateBriefResult(raw, context);
    case "OUTLINE_SUGGESTION":
      return validateOutlineResult(raw);
    case "FAQ_SUGGESTION":
      return validateFaqResult(raw, context);
    case "META_SUGGESTION":
      return validateMetaResult(raw);
    case "CTA_SUGGESTION":
      return validateCtaResult(raw);
    case "MEDIA_SUGGESTION":
      return validateMediaSuggestionResult(raw, context);
    case "INTERNAL_LINK_SUGGESTION":
      return validateLinkSuggestionResult(raw, context);
    case "ALT_CAPTION_SUGGESTION":
      return validateAltCaptionResult(raw, context);
    default:
      throw new ContentGenerationError(`Không hỗ trợ validate loại "${type}".`, "INVALID_PROVIDER_OUTPUT");
  }
}

/** Extracts factIdsUsed/mediaIdsUsed for persistence on AiGenerationRun. */
export function extractUsedIds(
  type: ContentGenerationType,
  validated: unknown,
): { factIdsUsed: string[]; mediaIdsUsed: string[] } {
  if (SECTION_TYPES.includes(type)) {
    const v = validated as SectionResult;
    return { factIdsUsed: v.factIdsUsed, mediaIdsUsed: v.mediaIdsUsed };
  }
  if (type === "BRIEF_SUGGESTION") {
    const v = validated as BriefResult;
    return { factIdsUsed: v.factIdsUsed, mediaIdsUsed: [] };
  }
  if (type === "FAQ_SUGGESTION") {
    const v = validated as FaqResult;
    return { factIdsUsed: [...new Set(v.items.flatMap((i) => i.factIdsUsed))], mediaIdsUsed: [] };
  }
  if (type === "MEDIA_SUGGESTION") {
    const v = validated as MediaSuggestionResult;
    return { factIdsUsed: [], mediaIdsUsed: v.suggestions.map((s) => s.mediaAssetId) };
  }
  if (type === "ALT_CAPTION_SUGGESTION") {
    const v = validated as AltCaptionResult;
    return { factIdsUsed: [], mediaIdsUsed: v.mediaAssetId ? [v.mediaAssetId] : [] };
  }
  return { factIdsUsed: [], mediaIdsUsed: [] };
}
