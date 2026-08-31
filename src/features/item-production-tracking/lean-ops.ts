import type {
  ItemProductionIssueType,
  ItemProductionRiskStatus,
  ItemProductionSampleStatus,
} from "@prisma/client";

/** Risk severity for exception-first board ordering (higher = more urgent). */
export const RISK_SORT_PRIORITY: Record<ItemProductionRiskStatus, number> = {
  DELAYED: 5,
  AT_RISK: 4,
  NEEDS_ATTENTION: 3,
  BLOCKED: 2,
  ON_TRACK: 0,
};

export function sortByExceptionFirst<
  T extends {
    riskStatus: ItemProductionRiskStatus;
    promisedDeliveryDate: Date | string | null;
    openIssueCount?: number;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const riskDiff = RISK_SORT_PRIORITY[b.riskStatus] - RISK_SORT_PRIORITY[a.riskStatus];
    if (riskDiff !== 0) return riskDiff;
    const aIssue = a.openIssueCount ?? 0;
    const bIssue = b.openIssueCount ?? 0;
    if (bIssue !== aIssue) return bIssue - aIssue;
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
