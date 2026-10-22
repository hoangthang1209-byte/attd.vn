import type {
  RfqWorkflowState,
  RfqWorkflowStep,
  RfqWorkflowStepId,
} from "@/features/agent-os/management-team.types";

export const RFQ_TO_QUOTATION_WORKFLOW: readonly RfqWorkflowStep[] = [
  {
    id: "sales_qualify",
    owner: "SALES_MANAGER",
    dependsOn: [],
    outputKey: "salesQualification",
    approvalMode: "AUTO",
  },
  {
    id: "product_analyze",
    owner: "PRODUCT_MANAGER",
    dependsOn: ["sales_qualify"],
    outputKey: "technicalAnalysis",
    approvalMode: "AUTO",
  },
  {
    id: "sourcing_check",
    owner: "SOURCING_MANAGER",
    dependsOn: ["sales_qualify", "product_analyze"],
    outputKey: "sourcingAssessment",
    approvalMode: "AUTO",
  },
  {
    id: "production_check",
    owner: "PRODUCTION_MANAGER",
    dependsOn: ["product_analyze"],
    outputKey: "productionFeasibility",
    approvalMode: "AUTO",
  },
  {
    id: "finance_check",
    owner: "FINANCE_MANAGER",
    dependsOn: ["sourcing_check", "production_check"],
    outputKey: "commercialReview",
    approvalMode: "REVIEW",
  },
  {
    id: "sales_draft_quote",
    owner: "SALES_MANAGER",
    dependsOn: ["product_analyze", "sourcing_check", "production_check", "finance_check"],
    outputKey: "quotationDraft",
    approvalMode: "REVIEW",
  },
  {
    id: "chief_review",
    owner: "CHIEF_OF_STAFF",
    dependsOn: ["sales_draft_quote"],
    outputKey: "approvalPacket",
    approvalMode: "REVIEW",
  },
] as const;

const STEP_BY_ID = new Map<RfqWorkflowStepId, RfqWorkflowStep>(
  RFQ_TO_QUOTATION_WORKFLOW.map((step) => [step.id, step]),
);

export function getRfqWorkflowStep(id: RfqWorkflowStepId): RfqWorkflowStep {
  const step = STEP_BY_ID.get(id);
  if (!step) throw new Error(`Unknown RFQ workflow step: ${id}`);
  return step;
}

export function dependenciesSatisfied(step: RfqWorkflowStep, state: RfqWorkflowState): boolean {
  return step.dependsOn.every((dependency) => state[dependency] === "DONE");
}

export function listReadyRfqSteps(state: RfqWorkflowState): RfqWorkflowStep[] {
  return RFQ_TO_QUOTATION_WORKFLOW.filter((step) => {
    const status = state[step.id];
    if (status === "DONE" || status === "RUNNING" || status === "BLOCKED" || status === "FAILED") {
      return false;
    }
    return dependenciesSatisfied(step, state);
  });
}

export function assertRfqWorkflowInvariants(): void {
  const seen = new Set<RfqWorkflowStepId>();
  for (const step of RFQ_TO_QUOTATION_WORKFLOW) {
    if (seen.has(step.id)) throw new Error(`Duplicate workflow step: ${step.id}`);
    for (const dependency of step.dependsOn) {
      if (!STEP_BY_ID.has(dependency)) throw new Error(`Unknown dependency: ${dependency}`);
    }
    seen.add(step.id);
  }

  const quoteDraft = getRfqWorkflowStep("sales_draft_quote");
  for (const required of ["product_analyze", "sourcing_check", "production_check", "finance_check"] as const) {
    if (!quoteDraft.dependsOn.includes(required)) {
      throw new Error(`Quotation draft missing dependency: ${required}`);
    }
  }

  if (getRfqWorkflowStep("chief_review").approvalMode !== "REVIEW") {
    throw new Error("Chief of Staff review must remain an explicit review gate");
  }
}
