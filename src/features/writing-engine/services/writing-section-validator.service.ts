import type { WritingPlan, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";
import { countWords, isPublicUrl, stripUnsafeHtml } from "@/features/writing-engine/writing-utils";

export type SectionValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateSectionDraft(plan: WritingPlan, draft: WritingSectionDraft): SectionValidationResult {
  const errors: string[] = [];
  const section = plan.sections.find((s) => s.id === draft.sectionId);
  if (!section) {
    errors.push("Unknown section ID");
    return { valid: false, errors };
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

  if (/<script/i.test(draft.html)) errors.push("Script tags not allowed");
  if (draft.html !== stripUnsafeHtml(draft.html)) errors.push("Unsafe HTML detected");

  const urlMatches = draft.html.match(/href="([^"]+)"/gi) ?? [];
  for (const raw of urlMatches) {
    const url = raw.replace(/href="/i, "").replace(/"$/, "");
    if (!isPublicUrl(url)) errors.push(`Disallowed URL: ${url}`);
    const isPlanned =
      plan.internalLinkPlan.placements.some((l) => l.url === url) || url.startsWith("/");
    if (!isPlanned && /^https?:\/\//i.test(url)) errors.push(`Arbitrary external URL: ${url}`);
  }

  if (draft.heading !== section?.heading) {
    errors.push("Heading hierarchy/heading text must match plan");
  }

  for (const claim of draft.claims) {
    if (!claim.factId && /moq|lead time|gsm|\d+/i.test(claim.text)) {
      errors.push(`Unsupported numeric/business claim without fact ID: ${claim.text}`);
    }
  }

  if (countWords(draft.plainText) === 0 && draft.html.trim()) {
    errors.push("Plain text required");
  }

  return { valid: errors.length === 0, errors };
}
