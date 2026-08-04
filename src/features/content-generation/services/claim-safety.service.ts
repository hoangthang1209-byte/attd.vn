import { runClaimQa } from "@/features/writing-engine/qa/claim-qa";
import { ContentGenerationError } from "@/features/content-generation/contracts/generation.types";

export { runClaimQa };

export type ClaimSafetyRule = {
  category: string;
  pattern: RegExp;
  message: string;
};

/**
 * Extends the Writing Engine's claim patterns (writing-engine/qa/claim-qa.ts)
 * with the categories the Sprint 16.0 governance policy calls out explicitly:
 * factory ownership and price, in addition to MOQ/lead-time/capacity/cert/
 * superlative/guarantee already covered there.
 */
export const CLAIM_SAFETY_RULES: ClaimSafetyRule[] = [
  { category: "SUPERLATIVE_WITHOUT_FACT", pattern: /\btop\s*1\b|số\s*1|number\s*one|best nhất|tốt nhất thị trường/i, message: "Superlative claim chưa được fact hỗ trợ." },
  { category: "GUARANTEE_CLAIM", pattern: /\bguaranteed\b|đảm bảo\s*100%/i, message: "Guarantee claim chưa được fact hỗ trợ." },
  { category: "CERTIFICATION_WITHOUT_FACT", pattern: /\biso\s*\d+/i, message: "Certification claim cần fact hỗ trợ." },
  { category: "CAPACITY_WITHOUT_FACT", pattern: /\bcapacity\b|công suất\s*\d+/i, message: "Capacity claim cần fact hỗ trợ." },
  { category: "MOQ_WITHOUT_FACT", pattern: /\bmoq\b|minimum order|\d+\s*pcs/i, message: "MOQ claim cần fact hỗ trợ." },
  { category: "LEAD_TIME_WITHOUT_FACT", pattern: /lead time|giao hàng\s*(trong\s*)?\d+/i, message: "Lead-time claim cần fact hỗ trợ." },
  { category: "PRICE_WITHOUT_FACT", pattern: /\bgiá\s*(chỉ\s*)?\d|USD\s*\d|VND\s*\d|\$\d/i, message: "Price claim cần fact hỗ trợ." },
  {
    category: "FACTORY_OWNERSHIP_WITHOUT_FACT",
    pattern: /nhà máy riêng|own factory|nhà máy (của )?(chúng tôi|riêng)|self-owned factory/i,
    message: "Factory-ownership claim cần fact hỗ trợ.",
  },
];

export type ClaimSafetyViolation = {
  category: string;
  message: string;
};

/**
 * Returns the first unsafe-claim violation found in `text`, or null when the
 * text is safe. A claim is considered "safe" when the caller supplied at
 * least one fact ID that is present in the governed context — matching the
 * same pragmatic rule already used by writing-engine/qa/claim-qa.ts.
 */
export function findClaimSafetyViolation(
  text: string,
  factIdsUsed: string[],
  contextFactIds: string[],
): ClaimSafetyViolation | null {
  const hasFactSupport = factIdsUsed.length > 0 && factIdsUsed.every((id) => contextFactIds.includes(id));
  if (hasFactSupport) return null;

  for (const rule of CLAIM_SAFETY_RULES) {
    if (rule.pattern.test(text)) {
      return { category: rule.category, message: rule.message };
    }
  }
  return null;
}

/**
 * Throws ContentGenerationError("UNSAFE_CLAIM") when `text` contains an
 * unsupported claim category and `factIdsUsed` doesn't fully resolve against
 * `contextFactIds`. Used by structured-output.service.ts before a proposal
 * is allowed to reach GENERATED status.
 */
export function assertSafeProposalText(text: string, factIdsUsed: string[], contextFactIds: string[]): void {
  const violation = findClaimSafetyViolation(text, factIdsUsed, contextFactIds);
  if (violation) {
    throw new ContentGenerationError(
      `Nội dung chứa claim chưa được fact hỗ trợ (${violation.category}): ${violation.message}`,
      "UNSAFE_CLAIM",
    );
  }
}
