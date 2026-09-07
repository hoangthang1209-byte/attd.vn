import type {
  ItemProductionIssueType,
  ItemProductionRiskStatus,
  ItemProductionSampleStatus,
} from "@prisma/client";
import { isNextActionOverdue } from "@/features/item-production-tracking/progress-risk";

/**
 * Exception-first board ordering.
 * Conceptual priority:
 * DELAYED → AT_RISK → BLOCKED / open issues → overdue next action → NEEDS_ATTENTION → deadline → normal
 */
export const RISK_SORT_PRIORITY: Record<ItemProductionRiskStatus, number> = {
  DELAYED: 50,
  AT_RISK: 40,
  BLOCKED: 35,
  NEEDS_ATTENTION: 20,
  ON_TRACK: 0,
};

export function sortByExceptionFirst<
  T extends {
    riskStatus: ItemProductionRiskStatus;
    promisedDeliveryDate: Date | string | null;
    openIssueCount?: number;
    nextAction?: string | null;
    nextActionDueDate?: Date | string | null;
  },
>(items: T[], now: Date = new Date()): T[] {
  return [...items].sort((a, b) => {
    const riskDiff = RISK_SORT_PRIORITY[b.riskStatus] - RISK_SORT_PRIORITY[a.riskStatus];
    if (riskDiff !== 0) return riskDiff;

    const aIssue = a.openIssueCount ?? 0;
    const bIssue = b.openIssueCount ?? 0;
    if (bIssue !== aIssue) return bIssue - aIssue;

    const aOverdue = isNextActionOverdue(a.nextAction, a.nextActionDueDate ?? null, now) ? 1 : 0;
    const bOverdue = isNextActionOverdue(b.nextAction, b.nextActionDueDate ?? null, now) ? 1 : 0;
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;

    const aDue = a.promisedDeliveryDate ? new Date(a.promisedDeliveryDate).getTime() : Infinity;
    const bDue = b.promisedDeliveryDate ? new Date(b.promisedDeliveryDate).getTime() : Infinity;
    return aDue - bDue;
  });
}

export type QuickStageUpdateInput = {
  stageId: string;
  completedQuantity: number;
  rejectedOrReworkQuantity?: number;
  markComplete?: boolean;
  note?: string;
  expectedRowVersion?: number;
  adminUserId?: string | null;
  adminUsername?: string | null;
  bypassReason?: string | null;
};

export type ReportIssueInput = {
  productionItemId: string;
  issueType: ItemProductionIssueType;
  note?: string;
  adminUserId?: string | null;
};

export type ResolveIssueInput = {
  issueId: string;
  resolvedNote?: string;
  adminUserId?: string | null;
};

export type UpdateSampleStatusInput = {
  productionItemId: string;
  sampleStatus: ItemProductionSampleStatus;
  adminUserId?: string | null;
};

export type UpdateNextActionInput = {
  productionItemId: string;
  nextAction: string | null;
  nextActionDueDate: string | null;
  expectedRowVersion?: number;
  adminUserId?: string | null;
};
