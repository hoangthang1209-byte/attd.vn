import type { WritingPlan, WritingQaIssue } from "@/features/writing-engine/writing-engine.types";

export function runSchemaQa(plan: WritingPlan, faqCount: number): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const types = plan.schemaPlan.schemaTypes;

  if (types.includes("FAQPage") && faqCount === 0) {
    issues.push({
      code: "FAQ_SCHEMA_WITHOUT_FAQ",
      severity: "ERROR",
      message: "FAQPage schema without FAQ content",
    });
  }

  for (const bad of ["AggregateRating", "Review"]) {
    if (types.some((t) => t.includes(bad))) {
      issues.push({
        code: "FAKE_SCHEMA",
        severity: "BLOCKING",
        message: `Unsupported schema type: ${bad}`,
      });
    }
  }

  return issues;
}

export function runSafetyQa(plan: WritingPlan): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  if (!plan.outputRules.publicOutputOnly) {
    issues.push({
      code: "NOT_PUBLIC_SAFE",
      severity: "BLOCKING",
      message: "Plan not marked public-output safe",
    });
  }
  for (const usage of plan.factPlan.usages) {
    if (!usage.publicUseAllowed) {
      issues.push({
        code: "CONFIDENTIAL_FACT",
        severity: "BLOCKING",
        message: `Confidential fact in plan: ${usage.factId}`,
        factId: usage.factId,
      });
    }
  }
  return issues;
}
