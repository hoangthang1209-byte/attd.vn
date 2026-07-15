import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type {
  WritingFactPlan,
  WritingFactUsage,
  WritingSectionPlan,
} from "@/features/writing-engine/writing-engine.types";
import { isExactValueFactKey } from "@/features/writing-engine/writing-utils";

const DOMAIN_SECTION_MAP: Array<{ pattern: RegExp; types: string[] }> = [
  { pattern: /moq|minimum order|đặt tối thiểu/i, types: ["COMMERCIAL", "PRICING"] },
  { pattern: /lead.?time|giao hàng|turnaround/i, types: ["COMMERCIAL", "PROCESS"] },
  { pattern: /gsm|fabric|material|vải|chất liệu/i, types: ["MATERIAL", "PRODUCT"] },
  { pattern: /print|embroidery|thêu|in /i, types: ["TECHNIQUE", "PROCESS"] },
  { pattern: /factory|manufactur|xưởng|capacity/i, types: ["MANUFACTURING", "PROCESS"] },
  { pattern: /price|pricing|giá/i, types: ["COMMERCIAL", "PRICING"] },
];

function scoreFactForSection(
  fact: ContentContextPackage["facts"][0],
  section: WritingSectionPlan
): number {
  let score = fact.authorityRank / 100;
  const hay = `${fact.statement} ${fact.matchedOn.join(" ")} ${JSON.stringify(fact.structuredValue ?? {})}`;
  for (const rule of DOMAIN_SECTION_MAP) {
    if (rule.pattern.test(hay) && rule.types.includes(section.type)) {
      score += 3;
    }
  }
  if (fact.matchedOn.some((m) => section.purpose.toLowerCase().includes(m.toLowerCase()))) {
    score += 2;
  }
  if (
    section.type === "PROCESS" &&
    /factory|capacity|manufactur|xưởng|sản xuất/i.test(hay)
  ) {
    score += 2;
  }
  if (fact.required) score += 2;
  if (fact.stale) score -= 1;
  return score;
}

export function allocateFactsToSections(
  pkg: ContentContextPackage,
  sections: WritingSectionPlan[]
): { sections: WritingSectionPlan[]; factPlan: WritingFactPlan } {
  const excluded = new Set<string>();
  for (const conflict of pkg.conflicts) {
    if (!conflict.publicUseAllowed) {
      for (const c of conflict.competingFacts) excluded.add(c.factId);
    }
  }

  const usableFacts = pkg.facts.filter(
    (f) => f.publicOutputAllowed && f.visibility === "PUBLIC" && !excluded.has(f.factId)
  );

  const allocated = new Map<string, string>();
  const usages: WritingFactUsage[] = [];
  const updatedSections = sections.map((section) => ({ ...section }));

  const requiredFacts = usableFacts.filter((f) => f.required);
  for (const fact of requiredFacts) {
    let bestSection = updatedSections[0];
    let bestScore = -1;
    for (const section of updatedSections) {
      const score = scoreFactForSection(fact, section);
      if (score > bestScore) {
        bestScore = score;
        bestSection = section;
      }
    }
    if (bestSection) {
      bestSection.requiredFactIds.push(fact.factId);
      allocated.set(fact.factId, bestSection.id);
      usages.push(buildUsage(fact, bestSection.id, true));
    }
  }

  for (const fact of usableFacts.filter((f) => !f.required)) {
    if (allocated.has(fact.factId)) continue;
    const candidates = updatedSections
      .map((section) => ({ section, score: scoreFactForSection(fact, section) }))
      .filter((c) => c.score >= 1)
      .sort((a, b) => b.score - a.score);

    const pick = candidates[0];
    if (!pick) continue;
    if (pick.section.optionalFactIds.length >= 3 && !fact.required) continue;

    pick.section.optionalFactIds.push(fact.factId);
    allocated.set(fact.factId, pick.section.id);
    usages.push(buildUsage(fact, pick.section.id, false));
  }

  for (const rule of pkg.businessRules) {
    if (!rule.publicOutputAllowed) continue;
    const sectionId = allocated.get(rule.sourceFactId);
    if (!sectionId) continue;
    const section = updatedSections.find((s) => s.id === sectionId);
    if (section && !section.businessRuleIds.includes(rule.ruleId)) {
      section.businessRuleIds.push(rule.ruleId);
    }
  }

  const unallocated = usableFacts
    .filter((f) => f.required && !allocated.has(f.factId))
    .map((f) => f.factId);

  return {
    sections: updatedSections,
    factPlan: {
      usages,
      unallocatedFactIds: unallocated,
      excludedFactIds: [...excluded],
    },
  };
}

function buildUsage(
  fact: ContentContextPackage["facts"][0],
  sectionId: string,
  required: boolean
): WritingFactUsage {
  const structuredKeys = Object.keys(fact.structuredValue ?? {});
  const mustExact =
    structuredKeys.some(isExactValueFactKey) ||
    /moq|lead time|gsm|capacity|price/i.test(fact.statement);

  return {
    factId: fact.factId,
    sectionId,
    required,
    allowedParaphrase: !mustExact,
    mustUseExactValue: mustExact,
    citationRequired: true,
    publicUseAllowed: fact.publicOutputAllowed,
    usageNotes: fact.stale ? ["Fact marked stale — verify before publish"] : [],
  };
}
