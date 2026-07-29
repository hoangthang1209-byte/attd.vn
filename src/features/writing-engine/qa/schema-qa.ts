import type { WritingPlan, WritingQaIssue } from "@/features/writing-engine/writing-engine.types";
import { evaluateFaqSchemaSignal } from "@/features/content/editorial/review-approval.policy";

export type SchemaQaFaqInput = { structuredFaqCount: number; visibleFaqCount: number };

export function runSchemaQa(
  plan: WritingPlan,
  faq: number | SchemaQaFaqInput
): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const types = plan.schemaPlan.schemaTypes;
  const faqInput: SchemaQaFaqInput =
    typeof faq === "number" ? { structuredFaqCount: faq, visibleFaqCount: 0 } : faq;

  const faqSignal = evaluateFaqSchemaSignal({ schemaTypes: types, ...faqInput });
  if (faqSignal.code && faqSignal.message) {
    issues.push({
      code: faqSignal.code,
      severity: faqSignal.severity === "ERROR" ? "ERROR" : "WARNING",
      message: faqSignal.message,
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
