import type { ItemProductionIssueType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyStageProgress,
  getProductionItem,
  updateProductionItem,
} from "@/features/item-production-tracking/item-production.service";
import {
  computeRiskStatus,
  computeWeightedProgressPercent,
  deriveCurrentStageKey,
  deriveDeliveryStatus,
  deriveReadyQuantity,
  isNextActionOverdue,
} from "@/features/item-production-tracking/progress-risk";
import type {
  QuickStageUpdateInput,
  ReportIssueInput,
  ResolveIssueInput,
  UpdateSampleStatusInput,
} from "@/features/item-production-tracking/lean-ops";

export async function applyQuickStageUpdate(input: QuickStageUpdateInput) {
  const stage = await prisma.itemProductionStage.findUnique({
    where: { id: input.stageId },
    include: {
      productionItem: {
        include: {
          batches: { where: { status: "ACTIVE" }, select: { id: true } },
        },
      },
    },
  });
  if (!stage) throw new Error("Không tìm thấy công đoạn");
  if (stage.productionItem.batches.length > 0) {
    throw new Error("Item đang theo dõi theo lô. Vui lòng cập nhật ở cấp lô.");
  }
  if (!Number.isFinite(input.completedQuantity) || input.completedQuantity < 0) {
    throw new Error("Số lượng hoàn thành không hợp lệ.");
  }

  const targetCompleted = input.completedQuantity;
  const targetRework = input.rejectedOrReworkQuantity ?? stage.rejectedQuantity + stage.reworkQuantity;

  if (input.markComplete) {
    return applyStageProgress({
      stageId: input.stageId,
      action: "COMPLETE",
      quantityDelta: Math.max(0, targetCompleted - stage.completedQuantity),
      acceptedQuantityDelta: Math.max(0, targetCompleted - targetRework - stage.acceptedQuantity),
      rejectedQuantityDelta: Math.max(0, targetRework - stage.rejectedQuantity - stage.reworkQuantity),
      note: input.note,
      expectedRowVersion: input.expectedRowVersion,
      adminUserId: input.adminUserId,
      adminUsername: input.adminUsername,
      bypassReason: input.bypassReason,
    });
  }

  if (stage.status === "NOT_STARTED") {
    await applyStageProgress({
      stageId: input.stageId,
      action: "START",
      expectedRowVersion: input.expectedRowVersion,
      adminUserId: input.adminUserId,
      adminUsername: input.adminUsername,
      bypassReason: input.bypassReason,
    });
  } else if (stage.status === "BLOCKED") {
    await applyStageProgress({
      stageId: input.stageId,
      action: "UNBLOCK",
      expectedRowVersion: input.expectedRowVersion,
      adminUserId: input.adminUserId,
      adminUsername: input.adminUsername,
      bypassReason: input.bypassReason,
    });
  }

  const refreshed = await prisma.itemProductionStage.findUnique({ where: { id: input.stageId } });
  if (!refreshed) throw new Error("Không tìm thấy công đoạn");

  return applyStageProgress({
    stageId: input.stageId,
    action: "PROGRESS_UPDATE",
    quantityDelta: targetCompleted - refreshed.completedQuantity,
    rejectedQuantityDelta: Math.max(
      0,
      targetRework - refreshed.rejectedQuantity - refreshed.reworkQuantity,
    ),
    note: input.note,
    expectedRowVersion: input.expectedRowVersion,
    adminUserId: input.adminUserId,
    adminUsername: input.adminUsername,
    bypassReason: input.bypassReason,
  });
}

export async function reportProductionIssue(input: ReportIssueInput) {
  const item = await prisma.itemProductionTracking.findUnique({
    where: { id: input.productionItemId },
    select: { id: true },
  });
  if (!item) throw new Error("Không tìm thấy item sản xuất");

  const issue = await prisma.itemProductionIssue.create({
    data: {
      productionItemId: input.productionItemId,
      issueType: input.issueType,
      note: input.note ?? null,
      createdByAdminUserId: input.adminUserId ?? null,
    },
    include: { createdByAdminUser: { select: { id: true, username: true } } },
  });

  await recomputeItemRiskWithIssues(input.productionItemId);
  return issue;
}

export async function resolveProductionIssue(input: ResolveIssueInput) {
  const issue = await prisma.itemProductionIssue.findUnique({ where: { id: input.issueId } });
  if (!issue) throw new Error("Không tìm thấy vấn đề");
  if (issue.isResolved) throw new Error("Vấn đề đã được xử lý.");

  const updated = await prisma.itemProductionIssue.update({
    where: { id: input.issueId },
    data: {
      isResolved: true,
      resolvedNote: input.resolvedNote ?? null,
      resolvedAt: new Date(),
      resolvedByAdminUserId: input.adminUserId ?? null,
    },
    include: {
      createdByAdminUser: { select: { id: true, username: true } },
      resolvedByAdminUser: { select: { id: true, username: true } },
    },
  });

  await recomputeItemRiskWithIssues(issue.productionItemId);
  return updated;
}

export async function listProductionIssues(productionItemId: string) {
  return prisma.itemProductionIssue.findMany({
    where: { productionItemId },
    orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
    include: {
      createdByAdminUser: { select: { id: true, username: true } },
      resolvedByAdminUser: { select: { id: true, username: true } },
    },
  });
}

export async function updateSampleStatus(input: UpdateSampleStatusInput) {
  const updated = await prisma.itemProductionTracking.update({
    where: { id: input.productionItemId },
    data: {
      sampleStatus: input.sampleStatus,
      rowVersion: { increment: 1 },
    },
  });
  await recomputeItemRiskWithIssues(input.productionItemId);
  return updated;
}

async function recomputeItemRiskWithIssues(productionItemId: string) {
  const item = await prisma.itemProductionTracking.findUnique({
    where: { id: productionItemId },
    include: {
      stages: { orderBy: { sequence: "asc" } },
      issues: { where: { isResolved: false }, select: { id: true } },
    },
  });
  if (!item) return;

  const openIssues = item.issues.length;
  const progressPercent = computeWeightedProgressPercent(item.stages);
  const readyQuantity = deriveReadyQuantity(item.stages);
  const currentStageKey = deriveCurrentStageKey(item.stages);
  const deliveryStatus = deriveDeliveryStatus({
    readyQuantity,
    plannedQuantity: item.plannedQuantity,
  });
  const hasBlockedStage = item.stages.some((s) => s.isApplicable && s.status === "BLOCKED");
  const hasRejectedOrRework = item.stages.some(
    (s) => s.isApplicable && (s.rejectedQuantity > 0 || s.reworkQuantity > 0),
  );

  let productionStatus = item.productionStatus;
  const applicable = item.stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
  if (applicable.length > 0 && applicable.every((s) => s.status === "COMPLETED")) {
    productionStatus = "COMPLETED";
  } else if (
    applicable.some(
      (s) => s.status === "IN_PROGRESS" || s.status === "COMPLETED" || s.status === "BLOCKED",
    )
  ) {
    productionStatus = progressPercent >= 70 ? "FINISHING" : "IN_PRODUCTION";
  }

  const riskStatus = computeRiskStatus({
    promisedDeliveryDate: item.promisedDeliveryDate,
    progressPercent,
    readyQuantity,
    plannedQuantity: item.plannedQuantity,
    lastProgressAt: item.lastProgressAt,
    productionStatus,
    hasBlockedStage,
    hasRejectedOrRework,
    hasSupplier: item.supplierId != null,
    hasUnresolvedIssue: openIssues > 0,
    hasOverdueNextAction: isNextActionOverdue(item.nextAction, item.nextActionDueDate),
  });

  await prisma.itemProductionTracking.update({
    where: { id: productionItemId },
    data: {
      progressPercent,
      readyQuantity: Math.min(readyQuantity, item.plannedQuantity),
      currentStageKey,
      deliveryStatus,
      productionStatus,
      riskStatus,
      rowVersion: { increment: 1 },
    },
  });
}

export { getProductionItem, updateProductionItem };
