import type { WritingQaIssue, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";

const CLAIM_PATTERNS: Array<{ pattern: RegExp; code: string; message: string }> = [
  { pattern: /\btop\s*1\b|số\s*1|number\s*one|best nhất/i, code: "SUPERLATIVE", message: "Unsupported superlative" },
  { pattern: /\bguaranteed\b|đảm bảo\s*100%/i, code: "GUARANTEE", message: "Unsupported guarantee claim" },
  { pattern: /\biso\s*\d+/i, code: "CERTIFICATION", message: "Certification claim needs evidence" },
  { pattern: /\bcapacity\b|công suất\s*\d+/i, code: "CAPACITY", message: "Capacity claim needs fact mapping" },
  { pattern: /\bmoq\b|minimum order|\d+\s*pcs/i, code: "MOQ", message: "MOQ claim needs fact mapping" },
  { pattern: /lead time|giao hàng\s*\d+/i, code: "LEAD_TIME", message: "Lead time claim needs fact mapping" },
];

export function runClaimQa(sections: WritingSectionDraft[]): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];

  for (const section of sections) {
    const hay = `${section.plainText} ${section.claims.map((c) => c.text).join(" ")}`;
    for (const rule of CLAIM_PATTERNS) {
      if (!rule.pattern.test(hay)) continue;
      const hasFact = section.claims.some((c) => c.factId) || section.factIdsUsed.length > 0;
      if (!hasFact) {
        issues.push({
          code: rule.code,
          severity: "WARNING",
          message: rule.message,
          sectionId: section.sectionId,
        });
      }
    }
  }

  return issues;
}
