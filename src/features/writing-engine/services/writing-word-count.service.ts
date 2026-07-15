import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type { WritingSectionPlan } from "@/features/writing-engine/writing-engine.types";
import { mapSectionPriority } from "@/features/writing-engine/services/writing-outline-compiler.service";

export type WordCountAllocationDiagnostics = {
  briefMin: number;
  briefMax: number;
  totalMin: number;
  totalMax: number;
  perSection: Array<{ sectionId: string; min: number; max: number; weight: number }>;
};

export function allocateWordCounts(
  sections: WritingSectionPlan[],
  pkg: ContentContextPackage,
  profile: WritingProfile
): { sections: WritingSectionPlan[]; diagnostics: WordCountAllocationDiagnostics } {
  const briefMin = pkg.brief.wordCount?.min ?? profile.defaultWordCountMin;
  const briefMax = pkg.brief.wordCount?.max ?? profile.defaultWordCountMax;

  const weights = sections.map((s) => {
    let w = mapSectionPriority(s.type);
    if (s.type === "INTRODUCTION" || s.type === "CTA") w = 0.6;
    if (s.type === "FAQ") w = Math.max(1, (pkg.topic.questions?.length ?? 1) * 0.5);
    return { sectionId: s.id, weight: w };
  });

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0) || 1;
  const targetMid = Math.round((briefMin + briefMax) / 2);

  const perSection = weights.map((w) => {
    const share = w.weight / totalWeight;
    const min = Math.max(40, Math.round(targetMid * share * 0.85));
    const max = Math.max(min + 20, Math.round(targetMid * share * 1.15));
    return { sectionId: w.sectionId, min, max, weight: w.weight };
  });

  let totalMin = perSection.reduce((s, p) => s + p.min, 0);
  let totalMax = perSection.reduce((s, p) => s + p.max, 0);

  if (totalMin > briefMax) {
    const scale = briefMax / totalMin;
    for (const p of perSection) {
      p.min = Math.max(40, Math.round(p.min * scale));
      p.max = Math.max(p.min + 10, Math.round(p.max * scale));
    }
  }
  if (totalMax < briefMin) {
    const boost = briefMin / Math.max(totalMax, 1);
    for (const p of perSection) {
      p.max = Math.round(p.max * boost);
      p.min = Math.min(p.min, p.max - 10);
    }
  }

  totalMin = perSection.reduce((s, p) => s + p.min, 0);
  totalMax = perSection.reduce((s, p) => s + p.max, 0);

  const updated = sections.map((section) => {
    const alloc = perSection.find((p) => p.sectionId === section.id);
    if (!alloc) return section;
    return {
      ...section,
      targetWordCountMin: alloc.min,
      targetWordCountMax: alloc.max,
    };
  });

  return {
    sections: updated,
    diagnostics: {
      briefMin,
      briefMax,
      totalMin,
      totalMax,
      perSection,
    },
  };
}
