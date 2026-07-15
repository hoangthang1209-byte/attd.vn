import type { WritingPlan, WritingQaIssue, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";
import { isPublicUrl } from "@/features/writing-engine/writing-utils";

export function runLinkQa(plan: WritingPlan, sections: WritingSectionDraft[]): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const targetCounts = new Map<string, number>();

  for (const link of plan.internalLinkPlan.placements) {
    if (!link.anchorText.trim()) {
      issues.push({ code: "EMPTY_ANCHOR", severity: "ERROR", message: "Empty anchor text", linkId: link.id });
    }
    if (!isPublicUrl(link.url)) {
      issues.push({ code: "DISALLOWED_URL", severity: "ERROR", message: `Disallowed URL: ${link.url}`, linkId: link.id });
    }
    targetCounts.set(link.targetId, (targetCounts.get(link.targetId) ?? 0) + 1);
  }

  for (const [targetId, count] of targetCounts) {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_TARGET",
        severity: "WARNING",
        message: `Duplicate internal link target: ${targetId}`,
      });
    }
  }

  const usedLinkIds = new Set(sections.flatMap((s) => s.internalLinkIdsUsed));
  for (const required of plan.internalLinkPlan.placements.filter((l) => l.required)) {
    if (!usedLinkIds.has(required.id)) {
      issues.push({
        code: "MISSING_REQUIRED_LINK",
        severity: "WARNING",
        message: `Required link not used: ${required.targetTitle}`,
        linkId: required.id,
      });
    }
  }

  return issues;
}
