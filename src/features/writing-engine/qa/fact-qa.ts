import type { WritingPlan, WritingQaIssue, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";

export function runFactQa(plan: WritingPlan, sections: WritingSectionDraft[]): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const pkgFactIds = new Set(plan.factPlan.usages.map((u) => u.factId));

  for (const section of sections) {
    for (const factId of section.factIdsUsed) {
      if (!pkgFactIds.has(factId)) {
        issues.push({
          code: "UNKNOWN_FACT",
          severity: "ERROR",
          message: `Unknown fact ID used: ${factId}`,
          sectionId: section.sectionId,
          factId,
        });
        continue;
      }
      const usage = plan.factPlan.usages.find((u) => u.factId === factId);
      if (usage && usage.sectionId !== section.sectionId) {
        issues.push({
          code: "FACT_WRONG_SECTION",
          severity: "WARNING",
          message: `Fact ${factId} not allocated to section`,
          sectionId: section.sectionId,
          factId,
        });
      }
    }
  }

  for (const required of plan.factPlan.usages.filter((u) => u.required)) {
    const used = sections.some((s) => s.factIdsUsed.includes(required.factId));
    if (!used) {
      issues.push({
        code: "MISSING_REQUIRED_FACT",
        severity: "ERROR",
        message: `Required fact not used: ${required.factId}`,
        factId: required.factId,
        sectionId: required.sectionId,
      });
    }
  }

  for (const excluded of plan.factPlan.excludedFactIds) {
    if (sections.some((s) => s.factIdsUsed.includes(excluded))) {
      issues.push({
        code: "EXCLUDED_FACT_USED",
        severity: "BLOCKING",
        message: `Excluded/conflict fact used: ${excluded}`,
        factId: excluded,
      });
    }
  }

  return issues;
}
