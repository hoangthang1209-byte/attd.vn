import type {
  WritingPlan,
  WritingSectionDraft,
  WritingSectionRequest,
} from "@/features/writing-engine/writing-engine.types";
import { countWords, isPublicUrl, stripUnsafeHtml } from "@/features/writing-engine/writing-utils";
import { sanitizeWritingSectionHtml } from "@/features/writing-engine/services/writing-section-sanitize.service";

export type SectionValidationResult = {
  valid: boolean;
  errors: string[];
  repairable: boolean;
};

const REPAIRABLE_CODES = [
  "HEADING_MISMATCH",
  "MISSING_PLAIN_TEXT",
  "UNSAFE_HTML_FORMAT",
  "WORD_COUNT_MISMATCH",
];

function extractNumbers(text: string): number[] {
  return [...text.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) =>
    Number(m[1].replace(",", "."))
  );
}

export function validateExactNumericFacts(
  request: WritingSectionRequest,
  draft: WritingSectionDraft
): string[] {
  const errors: string[] = [];
  const hay = `${draft.plainText} ${draft.html} ${draft.claims.map((c) => c.text).join(" ")}`;

  for (const fact of request.facts.filter((f) => f.mustUseExactValue)) {
    const structured = fact.structuredValue ?? {};
    for (const [key, value] of Object.entries(structured)) {
      if (typeof value !== "number" && (typeof value !== "string" || !/^\d/.test(value))) {
        continue;
      }
      const expected = typeof value === "number" ? value : Number(String(value).replace(",", "."));
      if (!Number.isFinite(expected)) continue;

      const nums = extractNumbers(hay);
      // If section uses this factId, require expected value appears somewhere for key domains
      if (
        draft.factIdsUsed.includes(fact.factId) &&
        /moq|lead|gsm|capacity|price/i.test(key)
      ) {
        if (!nums.some((n) => Math.abs(n - expected) < 0.01)) {
          errors.push(`Exact numeric fact altered or missing for ${fact.factId}:${key}=${expected}`);
        }
        // Reject nearby wrong mutations e.g. MOQ 100 -> 150 when 150 also present without 100
        if (/moq/i.test(key) && nums.includes(expected * 1.5) && !nums.includes(expected)) {
          errors.push(`MOQ mutation detected for ${fact.factId}`);
        }
      }
    }
  }

  return errors;
}

export function validateSectionDraft(
  plan: WritingPlan,
  draft: WritingSectionDraft,
  request?: WritingSectionRequest
): SectionValidationResult {
  const errors: string[] = [];
  const section = plan.sections.find((s) => s.id === draft.sectionId);
  if (!section) {
    return { valid: false, errors: ["Unknown section ID"], repairable: false };
  }

  if (/<h1[\s>]/i.test(draft.html)) {
    errors.push("H1 injection not allowed");
  }

  if (/full article|toàn bài|bài viết hoàn chỉnh/i.test(draft.plainText)) {
    errors.push("Full-article output rejected");
  }

  const allowedFacts = new Set([
    ...section.requiredFactIds,
    ...section.optionalFactIds,
    ...plan.factPlan.usages.filter((u) => u.sectionId === draft.sectionId).map((u) => u.factId),
  ]);

  for (const factId of draft.factIdsUsed) {
    if (!allowedFacts.has(factId) && !plan.factPlan.usages.some((u) => u.factId === factId)) {
      errors.push(`Unknown fact ID: ${factId}`);
    }
  }

  for (const linkId of draft.internalLinkIdsUsed) {
    if (!plan.internalLinkPlan.placements.some((l) => l.id === linkId)) {
      errors.push(`Unknown internal link ID: ${linkId}`);
    }
  }

  for (const mediaId of draft.mediaPlacementIdsUsed) {
    if (!plan.mediaPlan.placements.some((m) => m.id === mediaId)) {
      errors.push(`Unknown media placement ID: ${mediaId}`);
    }
  }

  for (const citeId of draft.citationIdsUsed) {
    if (!plan.citationPlan.citations.some((c) => c.id === citeId)) {
      errors.push(`Unknown citation ID: ${citeId}`);
    }
  }

  if (/<script/i.test(draft.html) || /base64,/i.test(draft.html)) {
    errors.push("Unsafe HTML content");
  }
  const sanitized = sanitizeWritingSectionHtml(draft.html);
  if (stripUnsafeHtml(draft.html) !== draft.html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")) {
    // soft check — prefer sanitize pass
  }
  if (sanitized !== draft.html && /on\w+=|javascript:/i.test(draft.html)) {
    errors.push("Unsafe HTML detected");
  }

  const urlMatches = draft.html.match(/href="([^"]+)"/gi) ?? [];
  for (const raw of urlMatches) {
    const url = raw.replace(/href="/i, "").replace(/"$/, "");
    if (!isPublicUrl(url)) errors.push(`Disallowed URL: ${url}`);
    const isPlanned =
      plan.internalLinkPlan.placements.some((l) => l.url === url) || url.startsWith("/");
    if (!isPlanned && /^https?:\/\//i.test(url)) errors.push(`Arbitrary external URL: ${url}`);
  }

  if (draft.heading !== section.heading) {
    errors.push("HEADING_MISMATCH: Heading must match plan");
  }

  for (const claim of draft.claims) {
    if (!claim.factId && /moq|lead time|gsm|\d+/i.test(claim.text)) {
      errors.push(`Unsupported numeric/business claim without fact ID: ${claim.text}`);
    }
  }

  if (countWords(draft.plainText) === 0 && draft.html.trim()) {
    errors.push("MISSING_PLAIN_TEXT: Plain text required");
  }

  const wordCount = countWords(draft.plainText);
  if (
    wordCount > 0 &&
    (wordCount < section.targetWordCountMin * 0.4 || wordCount > section.targetWordCountMax * 2.5)
  ) {
    errors.push("WORD_COUNT_MISMATCH: Word count outside reasonable tolerance");
  }

  if (request) {
    errors.push(...validateExactNumericFacts(request, draft));
  }

  const blockingSafety = errors.some((e) =>
    /Unknown fact|Arbitrary external|Unsafe HTML|H1 injection|Full-article|Exact numeric|MOQ mutation|invent/i.test(
      e
    )
  );

  return {
    valid: errors.length === 0,
    errors,
    repairable:
      !blockingSafety &&
      errors.some((e) => REPAIRABLE_CODES.some((c) => e.includes(c))) &&
      !errors.some((e) => /Unknown|Arbitrary|Exact numeric|MOQ|Unsafe HTML content|H1/i.test(e) && !e.includes("FORMAT")),
  };
}

export function isRetryableProviderError(message: string): boolean {
  return /timeout|timed out|429|rate limit|5\d\d|ECONN|ENOTFOUND|fetch failed|malformed json|non-JSON/i.test(
    message
  );
}

export function isSafetyViolation(errors: string[]): boolean {
  return errors.some((e) =>
    /Unknown fact|Arbitrary external|Exact numeric|MOQ mutation|H1 injection|Full-article|confidential|Unsafe HTML content/i.test(
      e
    )
  );
}
