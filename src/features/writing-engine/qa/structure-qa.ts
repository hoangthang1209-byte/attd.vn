import type { WritingPlan, WritingQaIssue, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";
import { countWords } from "@/features/writing-engine/writing-utils";

export function runStructureQa(
  plan: WritingPlan,
  sections: WritingSectionDraft[]
): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const hasH1 = plan.titlePlan.h1.trim().length > 0;
  if (!hasH1) {
    issues.push({
      code: "MISSING_H1",
      severity: "ERROR",
      message: "H1/title plan missing",
    });
  }

  for (const planned of plan.sections.filter((s) => s.required)) {
    const draft = sections.find((d) => d.sectionId === planned.id);
    if (!draft || !draft.plainText.trim()) {
      issues.push({
        code: "MISSING_REQUIRED_SECTION",
        severity: "ERROR",
        message: `Required section missing content: ${planned.heading}`,
        sectionId: planned.id,
      });
    }
  }

  let lastLevel = 1;
  for (const planned of plan.sections) {
    if (planned.headingLevel < lastLevel) {
      issues.push({
        code: "HEADING_HIERARCHY",
        severity: "WARNING",
        message: `Heading level jump at ${planned.heading}`,
        sectionId: planned.id,
      });
    }
    lastLevel = planned.headingLevel;
  }

  return issues;
}
