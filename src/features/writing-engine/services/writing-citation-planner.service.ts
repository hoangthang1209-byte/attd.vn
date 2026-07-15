import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingCitation, WritingCitationPlan } from "@/features/writing-engine/writing-engine.types";
import { stableId } from "@/features/writing-engine/writing-utils";

export function buildCitationPlan(pkg: ContentContextPackage): WritingCitationPlan {
  const citations: WritingCitation[] = [];

  for (const fact of pkg.facts) {
    if (!fact.publicOutputAllowed) continue;

    let displayMode: WritingCitation["displayMode"] = "INTERNAL_TRACE";
    let publicUrl: string | null = null;

    if (fact.evidenceUrl && !fact.evidenceUrl.includes("/admin")) {
      displayMode = "EVIDENCE_LINK";
      publicUrl = fact.evidenceUrl;
    }

    citations.push({
      id: stableId("cite", fact.factId),
      factId: fact.factId,
      sourceType: fact.sourceType,
      sourceId: fact.sourceId,
      sourceTitle: fact.sourceTitle,
      evidenceUrl: fact.evidenceUrl ?? null,
      publicUrl,
      displayMode,
      required: fact.required,
    });
  }

  return { citations };
}

export function citationsForSection(
  citationPlan: WritingCitationPlan,
  factIds: string[]
): WritingCitation[] {
  const set = new Set(factIds);
  return citationPlan.citations.filter((c) => set.has(c.factId));
}
