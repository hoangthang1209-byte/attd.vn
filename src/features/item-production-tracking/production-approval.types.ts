import type { ItemProductionStageKey, OrderItemProductionApprovalStatus } from "@prisma/client";

export type ProductionApprovalStatus = OrderItemProductionApprovalStatus;

export type ProductionApprovalFileSummary = {
  id: string;
  title: string | null;
  type: string;
  status: string;
  version: number;
  mediaAssetId: string;
  filename: string | null;
};

export type ProductionApprovalRecord = {
  id: string;
  orderItemId: string;
  status: ProductionApprovalStatus;
  sampleRequired: boolean;
  artworkFileId: string | null;
  sampleFileId: string | null;
  evidenceMediaAssetId: string | null;
  techPackId: string | null;
  approvedByContactId: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  note: string | null;
  releasedByAdminUserId: string | null;
  createdAt: string;
  updatedAt: string;
  artworkFile: ProductionApprovalFileSummary | null;
  sampleFile: ProductionApprovalFileSummary | null;
  evidenceMedia: {
    id: string;
    filename: string | null;
    url: string | null;
  } | null;
  techPack: {
    id: string;
    code: string;
    version: number;
    status: string;
    title: string | null;
  } | null;
  approvedByContact: {
    id: string;
    fullName: string;
    title: string | null;
  } | null;
  /** True when RELEASED artwork differs from current ACTIVE design artwork. */
  artworkStale: boolean;
  artworkStaleMessage: string | null;
};

export type UpsertProductionApprovalInput = {
  orderItemId: string;
  status: ProductionApprovalStatus;
  sampleRequired: boolean;
  artworkFileId?: string | null;
  sampleFileId?: string | null;
  evidenceMediaAssetId?: string | null;
  techPackId?: string | null;
  approvedByContactId?: string | null;
  approvedByName?: string | null;
  approvedAt?: Date | string | null;
  note?: string | null;
  adminUserId?: string | null;
};

export type ProductionApprovalGateResult =
  | { allowed: true }
  | {
      allowed: false;
      code: "APPROVAL_REQUIRED";
      message: string;
      orderItemId: string;
      productionJobHref: string;
    };

/** Stages that start/progress real manufacture (gate applies). Downstream QC/pack/ship stay ungated. */
export const PRODUCTION_APPROVAL_GATE_STAGE_KEYS: readonly ItemProductionStageKey[] = [
  "CUTTING",
  "PRINT_EMBROIDERY",
  "SEWING",
  "WASHING",
  "FINISHING",
] as const;

export function isProductionApprovalGateStage(
  stageKey: ItemProductionStageKey | string | null | undefined,
): boolean {
  if (!stageKey) return false;
  return (PRODUCTION_APPROVAL_GATE_STAGE_KEYS as readonly string[]).includes(stageKey);
}
