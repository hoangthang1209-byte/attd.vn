import type { ContentContextProfile } from "@/features/content-context/content-context-profiles";
import type {
  ContentContextBriefReadiness,
  ContentContextConflict,
  ContentContextMissingFact,
} from "@/features/content-context/content-context.types";

export type BriefReadinessInput = {
  topic: {
    id: string;
    title?: string | null;
    primaryKeyword?: string | null;
  } | null;
  brief: {
    id?: string;
    outline?: unknown;
    approvedAt?: string | Date | null;
    ctaText?: string | null;
    ctaType?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    workingTitle?: string | null;
  } | null;
  profile: ContentContextProfile;
  preview: boolean;
  factCount: number;
  conflicts: ContentContextConflict[];
  missingFacts: ContentContextMissingFact[];
  hasConfidentialFacts: boolean;
  hasMediaBundle: boolean;
  mediaCoverageLow: boolean;
  internalLinkCount: number;
  staleFactCount: number;
  legacyFactCount: number;
};

function outlineLength(outline: unknown): number {
  return Array.isArray(outline) ? outline.length : 0;
}

export function evaluateContentContextBriefReadiness(
  input: BriefReadinessInput,
): ContentContextBriefReadiness {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!input.topic) {
    errors.push("Topic missing.");
    score -= 40;
  } else if (!input.topic.primaryKeyword?.trim()) {
    errors.push("Topic missing primary keyword.");
    score -= 25;
  }

  if (input.profile.requireBrief && !input.brief) {
    errors.push("Brief missing for this profile.");
    score -= 30;
  }

  if (input.brief && outlineLength(input.brief.outline) === 0) {
    if (input.preview) {
      warnings.push("Outline empty — preview package may be incomplete.");
      score -= 10;
    } else {
      errors.push("Brief outline is empty.");
      score -= 25;
    }
  }

  if (input.profile.requireApprovedBrief && input.brief && !input.brief.approvedAt) {
    if (input.preview) {
      warnings.push("Brief not approved — preview only.");
      score -= 8;
    } else {
      errors.push("Approved Brief required but not approved.");
      score -= 25;
    }
  }

  if (input.factCount <= 0) {
    errors.push("No Retrieval facts available.");
    score -= 30;
  }

  if (input.hasConfidentialFacts) {
    errors.push("Public-output package contains confidential facts.");
    score -= 40;
  }

  const blockingConflicts = input.conflicts.filter((c) => !c.publicUseAllowed);
  if (blockingConflicts.length > 0) {
    errors.push(`Unresolved blocking conflict: ${blockingConflicts[0].key}`);
    score -= 25;
  }

  if (input.profile.requireCta) {
    const hasCta = Boolean(input.brief?.ctaText?.trim() || input.brief?.ctaType?.trim());
    if (!hasCta) {
      if (input.preview) {
        warnings.push("CTA missing for commercial landing profile.");
        score -= 10;
      } else {
        errors.push("CTA required for this profile.");
        score -= 20;
      }
    }
  }

  if (!input.hasMediaBundle) {
    warnings.push("Media Bundle missing.");
    score -= 5;
  }
  if (input.mediaCoverageLow) {
    warnings.push("Media coverage is low.");
    score -= 4;
  }
  if (input.internalLinkCount === 0) {
    warnings.push("No internal links available.");
    score -= 3;
  }
  if (input.staleFactCount > 0) {
    warnings.push(`${input.staleFactCount} stale fact(s).`);
    score -= Math.min(10, input.staleFactCount * 2);
  }
  if (input.legacyFactCount > 0) {
    warnings.push(`${input.legacyFactCount} legacy compatibility fact(s).`);
    score -= Math.min(8, input.legacyFactCount);
  }
  if (input.brief && !input.brief.metaTitle?.trim()) {
    warnings.push("Meta title incomplete.");
    score -= 2;
  }
  if (input.brief && !input.brief.metaDescription?.trim()) {
    warnings.push("Meta description incomplete.");
    score -= 2;
  }

  for (const missing of input.missingFacts) {
    if (missing.blocking && !input.preview) {
      errors.push(`Missing fact: ${missing.key}`);
      score -= 8;
    } else {
      warnings.push(`Missing fact: ${missing.key}`);
      score -= 3;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const ready = errors.length === 0;

  return { ready, score, errors, warnings };
}
