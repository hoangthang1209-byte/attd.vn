import "server-only";

import type { Prisma, ProductionPlanPriority, ProductionPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { getPermissionScope } from "@/features/auth/admin-permissions";
import {
  buildProductionJobCode,
  requiresProductionPlanning,
} from "@/features/production-planning/production-job-eligibility";
import {
  PRODUCTION_PLAN_DOC_STATUS_LABELS,
  PRODUCTION_PLAN_MATERIAL_STATUS_LABELS,
  PRODUCTION_PLAN_PRIORITY_LABELS,
  PRODUCTION_PLAN_QC_STATUS_LABELS,
  PRODUCTION_PLAN_STATUS_LABELS,
  PRODUCTION_BOARD_COLUMN_LABELS,
} from "@/features/production-planning/production-plan-labels";
import {
  deriveProductionPlanStatus,
  mapStatusToBoardColumn,
  resolveDocStatus,
  resolveMaterialStatus,
  resolveQcStatus,
} from "@/features/production-planning/production-plan-status";
import {
  computeProductionPlanRiskTone,
  computeProductionPlanRisks,
} from "@/features/production-planning/production-plan-risk";
import {
  buildAssignedJobFilter,
  buildProductionPlanOrderWhere,
  canEditProductionPlan,
  productionOrderStatusesWhere,
} from "@/features/production-planning/production-plan-scope";
import type {
  ProductionBoardCard,
  ProductionBoardColumnKey,
  ProductionBoardResponse,
  ProductionDashboardResponse,
  ProductionPlanDetail,
  ProductionPlanJobRow,
  ProductionPlanKpiKey,
  ProductionPlanListParams,
  ProductionPlanListResponse,
  ProductionPlanQuickFilter,
  ProductionPlanUpsertInput,
} from "@/features/production-planning/production-plan.types";
import {
  evaluateOrderItemReadiness,
  itemHasDesignFile,
  type OrderItemReadinessState,
} from "@/features/orders/order-item-readiness";
import { itemRequiresProductionDocuments } from "@/features/orders/order-item-stage-profile";
import {
  getOrderItemOperationalFlow,
  getOrderItemProcessingMethodLabel,
  getOrderItemSupplySourceLabel,
} from "@/features/orders/order-item-classification";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";

const KPI_DEFS: Array<{ key: ProductionPlanKpiKey; label: string; tone: string }> = [
  { key: "not_planned", label: "Chưa lập kế hoạch", tone: "slate" },
  { key: "missing_docs", label: "Thiếu tài liệu", tone: "orange" },
  { key: "missing_materials", label: "Thiếu vật tư", tone: "orange" },
  { key: "ready_to_start", label: "Sẵn sàng bắt đầu", tone: "green" },
  { key: "in_progress", label: "Đang sản xuất", tone: "blue" },
  { key: "awaiting_qc", label: "Chờ QC", tone: "purple" },
  { key: "at_risk", label: "Nguy cơ trễ", tone: "orange" },
  { key: "overdue", label: "Quá hạn", tone: "red" },
];

const QUICK_FILTER_DEFS: Array<{ key: ProductionPlanQuickFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "mine", label: "Việc của tôi" },
  { key: "not_planned", label: "Chưa lập KH" },
  { key: "missing_docs", label: "Thiếu tài liệu" },
  { key: "missing_materials", label: "Thiếu vật tư" },
  { key: "ready_to_start", label: "Sẵn sàng" },
  { key: "in_progress", label: "Đang SX" },
  { key: "awaiting_qc", label: "Chờ QC" },
  { key: "overdue", label: "Quá hạn" },
];

type ItemRow = Prisma.OrderItemGetPayload<{
  include: {
    order: {
      select: {
        id: true;
        orderNo: true;
        status: true;
        customerCompanyName: true;
        contactName: true;
        deliveryExpectedAt: true;
        productionOwnerId: true;
        productionOwnerName: true;
        salesEmployeeId: true;
      };
    };
    productionPlan: {
      include: { productionOwner: { select: { fullName: true } } };
    };
    product: { select: { featuredImage: true } };
  };
}>;

type EnrichedJob = {
  item: ItemRow;
  itemIndex: number;
  stages: ProductionStageRecord[];
  qc: QcInspectionRecord | null;
  files: Array<{ type: string; status: string }>;
  hasMaterialShortage: boolean;
  hasMaterialRequirements: boolean;
  readiness: OrderItemReadinessState;
  status: ProductionPlanStatus;
  docStatus: ReturnType<typeof resolveDocStatus>;
  materialStatus: ReturnType<typeof resolveMaterialStatus>;
  qcStatus: ReturnType<typeof resolveQcStatus>;
  risks: string[];
  riskTone: ReturnType<typeof computeProductionPlanRiskTone>;
  progressPercent: number | null;
};

function toStageRecord(
  row: ItemRow,
  s: {
    id: string;
    orderId: string;
    orderItemId: string | null;
    stageType: ProductionStageRecord["stageType"];
    status: ProductionStageRecord["status"];
    assignedEmployeeId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    plannedQuantity: { toString(): string } | null;
    completedQuantity: { toString(): string };
    passedQuantity: { toString(): string };
    defectQuantity: { toString(): string };
    reworkQuantity: { toString(): string };
    scrapQuantity: { toString(): string };
    note: string | null;
    sortOrder: number;
  },
): ProductionStageRecord {
  return {
    id: s.id,
    orderId: s.orderId,
    orderItemId: s.orderItemId,
    stageType: s.stageType,
    stageTypeLabel: s.stageType,
    status: s.status,
    statusLabel: s.status,
    assignedEmployeeId: s.assignedEmployeeId,
    assignedEmployeeName: null,
    startedAt: s.startedAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    plannedQuantity: s.plannedQuantity?.toString() ?? null,
    completedQuantity: s.completedQuantity.toString(),
    passedQuantity: s.passedQuantity.toString(),
    defectQuantity: s.defectQuantity.toString(),
    reworkQuantity: s.reworkQuantity.toString(),
    scrapQuantity: s.scrapQuantity.toString(),
    note: s.note,
    sortOrder: s.sortOrder,
  };
}

function toQcRecord(
  row: ItemRow,
  q: {
    id: string;
    orderId: string;
    orderItemId: string | null;
    status: QcInspectionRecord["status"];
    inspectedByEmployeeId: string | null;
    inspectedAt: Date | null;
    inspectedQuantity: { toString(): string };
    passedQuantity: { toString(): string };
    defectQuantity: { toString(): string };
    reworkQuantity: { toString(): string };
    scrapQuantity: { toString(): string };
    summary: string | null;
    correctiveAction: string | null;
  } | null,
): QcInspectionRecord | null {
  if (!q) return null;
  return {
    id: q.id,
    orderId: q.orderId,
    orderItemId: q.orderItemId,
    status: q.status,
    statusLabel: q.status,
    inspectedByEmployeeId: q.inspectedByEmployeeId,
    inspectedByEmployeeName: null,
    inspectedAt: q.inspectedAt?.toISOString() ?? null,
    inspectedQuantity: q.inspectedQuantity.toString(),
    passedQuantity: q.passedQuantity.toString(),
    defectQuantity: q.defectQuantity.toString(),
    reworkQuantity: q.reworkQuantity.toString(),
    scrapQuantity: q.scrapQuantity.toString(),
    summary: q.summary,
    correctiveAction: q.correctiveAction,
    evidence: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function batchItemMaterialShortage(itemIds: string[]): Promise<{
  shortageItems: Set<string>;
  requirementItems: Set<string>;
}> {
  const shortageItems = new Set<string>();
  const requirementItems = new Set<string>();
  if (itemIds.length === 0) return { shortageItems, requirementItems };

  const requirements = await prisma.orderItemMaterialRequirement.findMany({
    where: { orderItemId: { in: itemIds } },
    select: { orderItemId: true, materialId: true, requiredQuantity: true },
  });
  for (const r of requirements) requirementItems.add(r.orderItemId);

  const materialIds = [...new Set(requirements.map((r) => r.materialId).filter(Boolean))] as string[];
  const balances = materialIds.length
    ? await prisma.materialWarehouseBalance.findMany({
        where: { materialId: { in: materialIds } },
      })
    : [];
  const balanceByMaterial = new Map(balances.map((b) => [b.materialId, b.availableQuantity]));

  for (const req of requirements) {
    if (!req.materialId) continue;
    const available = balanceByMaterial.get(req.materialId);
    if (available == null || available.lt(req.requiredQuantity)) {
      shortageItems.add(req.orderItemId);
    }
  }
  return { shortageItems, requirementItems };
}

function buildItemSearchWhere(search?: string): Prisma.OrderItemWhereInput {
  const term = search?.trim();
  if (!term) return {};
  return {
    OR: [
      { order: { orderNo: { contains: term, mode: "insensitive" } } },
      { order: { customerCompanyName: { contains: term, mode: "insensitive" } } },
      { order: { contactName: { contains: term, mode: "insensitive" } } },
      { productNameSnapshot: { contains: term, mode: "insensitive" } },
      { skuSnapshot: { contains: term, mode: "insensitive" } },
      { productionPlan: { planCode: { contains: term, mode: "insensitive" } } },
    ],
  };
}

function enrichJob(
  item: ItemRow,
  itemIndex: number,
  ctx: {
    stages: ProductionStageRecord[];
    qc: QcInspectionRecord | null;
    files: Array<{ type: string; status: string }>;
    hasMaterialShortage: boolean;
    hasMaterialRequirements: boolean;
    now: Date;
  },
): EnrichedJob {
  const flow = getOrderItemOperationalFlow({
    supplySource: item.supplySource,
    processingMethod: item.processingMethod,
  });
  const needsDocs = itemRequiresProductionDocuments({
    supplySource: item.supplySource,
    processingMethod: item.processingMethod,
  });
  const { state: readiness } = evaluateOrderItemReadiness({
    supplySource: item.supplySource,
    processingMethod: item.processingMethod,
    orderedQuantity: item.quantity,
    stages: ctx.stages,
    qc: ctx.qc,
    activeFileCount: ctx.files.filter((f) => f.status === "ACTIVE").length,
    hasDesignFile: itemHasDesignFile(ctx.files),
  });

  const docStatus = resolveDocStatus({
    needsDocs,
    hasDesignFile: itemHasDesignFile(ctx.files),
    activeFileCount: ctx.files.filter((f) => f.status === "ACTIVE").length,
  });
  const materialStatus = resolveMaterialStatus({
    hasRequirements: ctx.hasMaterialRequirements,
    hasShortage: ctx.hasMaterialShortage,
  });
  const qcStatus = resolveQcStatus({ allowQc: flow.allowQc, readiness, qc: ctx.qc });

  const status = deriveProductionPlanStatus({
    hasPlan: Boolean(item.productionPlan),
    storedStatus: item.productionPlan?.status ?? null,
    readiness,
    docStatus,
    materialStatus,
    qcStatus,
    stages: ctx.stages,
  });

  const plan = item.productionPlan;
  const ownerId = plan?.productionOwnerId ?? item.order.productionOwnerId ?? null;
  const internalDeadline =
    plan?.internalDeadlineAt ?? item.order.deliveryExpectedAt ?? null;

  const risks = computeProductionPlanRisks({
    status,
    plannedStartAt: plan?.plannedStartAt ?? null,
    plannedEndAt: plan?.plannedEndAt ?? null,
    internalDeadlineAt: internalDeadline,
    deliveryDeadline: item.order.deliveryExpectedAt,
    ownerId,
    docStatus,
    materialStatus,
    qcStatus,
    now: ctx.now,
  });

  const stageSummary = computeStageProgressSummary(ctx.stages);
  const progressPercent =
    stageSummary.applicableCount > 0
      ? Math.round((stageSummary.completedCount / stageSummary.applicableCount) * 100)
      : null;

  return {
    item,
    itemIndex,
    stages: ctx.stages,
    qc: ctx.qc,
    files: ctx.files,
    hasMaterialShortage: ctx.hasMaterialShortage,
    hasMaterialRequirements: ctx.hasMaterialRequirements,
    readiness,
    status,
    docStatus,
    materialStatus,
    qcStatus,
    risks,
    riskTone: computeProductionPlanRiskTone(risks, status),
    progressPercent,
  };
}

function toJobRow(
  enriched: EnrichedJob,
  session: AdminSessionUser,
  canViewCustomer: boolean,
): ProductionPlanJobRow {
  const { item, itemIndex, status, docStatus, materialStatus, qcStatus, risks, riskTone, progressPercent } =
    enriched;
  const plan = item.productionPlan;
  const ownerId = plan?.productionOwnerId ?? item.order.productionOwnerId ?? null;
  const ownerName =
    plan?.productionOwner?.fullName ?? item.order.productionOwnerName ?? null;

  const colorParts = [item.colorSnapshot, item.variantNameSnapshot].filter(Boolean);

  return {
    orderItemId: item.id,
    planId: plan?.id ?? null,
    jobCode: plan?.planCode ?? buildProductionJobCode(item.order.orderNo, itemIndex),
    orderId: item.order.id,
    orderNo: item.order.orderNo,
    customerName: item.order.customerCompanyName ?? item.order.contactName ?? null,
    canViewCustomer,
    productName: item.productNameSnapshot ?? "Sản phẩm",
    productThumbnail: item.designImageUrl ?? item.product?.featuredImage ?? null,
    colorSpec: colorParts.length ? colorParts.join(" · ") : null,
    processingMethodLabel: getOrderItemProcessingMethodLabel(item.processingMethod),
    quantity: item.quantity,
    quantityUnit: item.unit,
    deliveryDeadline: item.order.deliveryExpectedAt?.toISOString() ?? null,
    internalDeadline: (plan?.internalDeadlineAt ?? item.order.deliveryExpectedAt)?.toISOString() ?? null,
    plannedStartAt: plan?.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: plan?.plannedEndAt?.toISOString() ?? null,
    ownerId,
    ownerName,
    workshopName: plan?.productionTeamName ?? null,
    priority: plan?.priority ?? "NORMAL",
    status,
    statusLabel: PRODUCTION_PLAN_STATUS_LABELS[status],
    docStatus,
    docStatusLabel: PRODUCTION_PLAN_DOC_STATUS_LABELS[docStatus],
    materialStatus,
    materialStatusLabel: PRODUCTION_PLAN_MATERIAL_STATUS_LABELS[materialStatus],
    qcStatus,
    qcStatusLabel: PRODUCTION_PLAN_QC_STATUS_LABELS[qcStatus],
    risks,
    riskTone,
    progressPercent,
    canEditPlan: canEditProductionPlan(session),
  };
}

function matchesKpi(enriched: EnrichedJob, kpi: ProductionPlanKpiKey, now: Date): boolean {
  const { status, risks, item } = enriched;
  switch (kpi) {
    case "not_planned":
      return !item.productionPlan;
    case "missing_docs":
      return enriched.docStatus === "missing";
    case "missing_materials":
      return enriched.materialStatus === "shortage";
    case "ready_to_start":
      return status === "READY_TO_START";
    case "in_progress":
      return status === "IN_PROGRESS";
    case "awaiting_qc":
      return status === "WAITING_QC";
    case "at_risk":
      return risks.includes("Sắp trễ");
    case "overdue":
      return risks.includes("Quá hạn");
    default:
      return true;
  }
}

function matchesQuickFilter(
  enriched: EnrichedJob,
  filter: ProductionPlanQuickFilter,
  employeeId: string | null,
): boolean {
  const { item, status, risks } = enriched;
  switch (filter) {
    case "all":
      return true;
    case "mine":
      if (!employeeId) return false;
      return (
        item.productionPlan?.productionOwnerId === employeeId ||
        item.order.productionOwnerId === employeeId
      );
    case "not_planned":
      return !item.productionPlan;
    case "missing_docs":
      return enriched.docStatus === "missing";
    case "missing_materials":
      return enriched.materialStatus === "shortage";
    case "ready_to_start":
      return status === "READY_TO_START";
    case "in_progress":
      return status === "IN_PROGRESS";
    case "awaiting_qc":
      return status === "WAITING_QC";
    case "overdue":
      return risks.includes("Quá hạn");
    default:
      return true;
  }
}

async function loadEligibleItems(where: Prisma.OrderItemWhereInput): Promise<ItemRow[]> {
  const items = await prisma.orderItem.findMany({
    where,
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          customerCompanyName: true,
          contactName: true,
          deliveryExpectedAt: true,
          productionOwnerId: true,
          productionOwnerName: true,
          salesEmployeeId: true,
        },
      },
      productionPlan: { include: { productionOwner: { select: { fullName: true } } } },
      product: { select: { featuredImage: true } },
    },
    orderBy: [{ order: { deliveryExpectedAt: "asc" } }, { sortOrder: "asc" }],
  });

  const orderItemCounts = new Map<string, number>();
  for (const item of items) {
    orderItemCounts.set(item.orderId, (orderItemCounts.get(item.orderId) ?? 0) + 1);
  }

  return items.filter((item) =>
    requiresProductionPlanning({
      supplySource: item.supplySource,
      processingMethod: item.processingMethod,
    }),
  );
}

async function enrichItems(items: ItemRow[], now: Date): Promise<EnrichedJob[]> {
  if (items.length === 0) return [];

  const itemIds = items.map((i) => i.id);
  const orderIds = [...new Set(items.map((i) => i.orderId))];

  const orderItemsByOrder = await prisma.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: { id: true, orderId: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const indexByItemId = new Map<string, number>();
  const counters = new Map<string, number>();
  for (const oi of orderItemsByOrder) {
    const idx = counters.get(oi.orderId) ?? 0;
    indexByItemId.set(oi.id, idx);
    counters.set(oi.orderId, idx + 1);
  }

  const [stagesRaw, qcsRaw, filesRaw, materialCtx] = await Promise.all([
    prisma.orderProductionStage.findMany({ where: { orderItemId: { in: itemIds } } }),
    prisma.orderQcInspection.findMany({ where: { orderItemId: { in: itemIds } } }),
    prisma.orderProductionFile.findMany({
      where: { orderItemId: { in: itemIds }, status: "ACTIVE" },
      select: { orderItemId: true, type: true, status: true },
    }),
    batchItemMaterialShortage(itemIds),
  ]);

  return items.map((item) => {
    const itemStages = stagesRaw
      .filter((s) => s.orderItemId === item.id)
      .map((s) => toStageRecord(item, s));
    const itemQc = toQcRecord(
      item,
      qcsRaw.find((q) => q.orderItemId === item.id) ?? null,
    );
    const itemFiles = filesRaw
      .filter((f) => f.orderItemId === item.id)
      .map((f) => ({ type: f.type, status: f.status }));

    return enrichJob(item, indexByItemId.get(item.id) ?? item.sortOrder, {
      stages: itemStages,
      qc: itemQc,
      files: itemFiles,
      hasMaterialShortage: materialCtx.shortageItems.has(item.id),
      hasMaterialRequirements: materialCtx.requirementItems.has(item.id),
      now,
    });
  });
}

function buildBaseItemWhere(session: AdminSessionUser): Prisma.OrderItemWhereInput {
  const assigned = buildAssignedJobFilter(session);
  const orderWhere = buildProductionPlanOrderWhere(session);
  return {
  ...(assigned ? assigned : {}),
    order: { AND: [productionOrderStatusesWhere(), orderWhere] },
  };
}

export async function listProductionPlans(
  session: AdminSessionUser,
  params: ProductionPlanListParams,
): Promise<ProductionPlanListResponse> {
  const now = new Date();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));

  const where: Prisma.OrderItemWhereInput = {
    ...buildBaseItemWhere(session),
    ...buildItemSearchWhere(params.search),
  };

  if (params.ownerId) {
    where.OR = [
      { productionPlan: { productionOwnerId: params.ownerId } },
      { order: { productionOwnerId: params.ownerId } },
    ];
  }
  if (params.priority) {
    where.productionPlan = { ...(where.productionPlan as object), priority: params.priority };
  }

  const items = await loadEligibleItems(where);
  const enriched = await enrichItems(items, now);

  let filtered = enriched;
  if (params.mine && session.employeeId) {
    filtered = filtered.filter((e) =>
      matchesQuickFilter(e, "mine", session.employeeId),
    );
  }
  if (params.quickFilter && params.quickFilter !== "all") {
    filtered = filtered.filter((e) =>
      matchesQuickFilter(e, params.quickFilter!, session.employeeId),
    );
  }
  if (params.kpi) {
    filtered = filtered.filter((e) => matchesKpi(e, params.kpi!, now));
  }
  if (params.status) {
    filtered = filtered.filter((e) => e.status === params.status);
  }

  const canViewCustomer = getPermissionScope(session, "crm.view") !== "NONE";

  const kpiCounts = Object.fromEntries(
    KPI_DEFS.map((k) => [k.key, enriched.filter((e) => matchesKpi(e, k.key, now)).length]),
  ) as Record<ProductionPlanKpiKey, number>;

  const quickCounts: Partial<Record<ProductionPlanQuickFilter, number>> = {
    mine: session.employeeId
      ? enriched.filter((e) => matchesQuickFilter(e, "mine", session.employeeId)).length
      : 0,
  };

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows: pageRows.map((e) => toJobRow(e, session, canViewCustomer)),
    total,
    page,
    pageSize,
    totalPages,
    summary: {
      kpis: KPI_DEFS.map((k) => ({ ...k, count: kpiCounts[k.key] })),
      quickFilters: QUICK_FILTER_DEFS.map((q) => ({
        ...q,
        count: q.key === "all" ? enriched.length : (quickCounts[q.key] ?? null),
      })),
    },
  };
}

export async function getProductionPlanDetail(
  session: AdminSessionUser,
  orderItemId: string,
): Promise<ProductionPlanDetail | null> {
  const where: Prisma.OrderItemWhereInput = {
    id: orderItemId,
    ...buildBaseItemWhere(session),
  };
  const items = await loadEligibleItems(where);
  if (items.length === 0) return null;

  const enriched = (await enrichItems(items, new Date()))[0];
  if (!enriched) return null;

  const canViewCustomer = getPermissionScope(session, "crm.view") !== "NONE";
  const row = toJobRow(enriched, session, canViewCustomer);
  const plan = enriched.item.productionPlan;
  const warnings: string[] = [];
  if (enriched.docStatus === "missing") warnings.push("Thiếu tài liệu sản xuất");
  if (enriched.materialStatus === "shortage") warnings.push("Thiếu vật tư");
  if (!row.ownerId) warnings.push("Chưa phân công người phụ trách");

  return {
    ...row,
    orderStatus: enriched.item.order.status,
    supplySourceLabel: getOrderItemSupplySourceLabel(enriched.item.supplySource),
    readinessLabel: enriched.readiness,
    planningNote: plan?.planningNote ?? null,
    riskNote: plan?.riskNote ?? null,
    estimatedLeadDays: plan?.estimatedLeadDays ?? null,
    warnings,
  };
}

export async function upsertProductionPlan(
  session: AdminSessionUser,
  orderItemId: string,
  input: ProductionPlanUpsertInput,
): Promise<ProductionPlanDetail> {
  if (!canEditProductionPlan(session)) {
    throw new Error("FORBIDDEN");
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, ...buildBaseItemWhere(session) },
    include: {
      order: { select: { orderNo: true, status: true } },
      productionPlan: true,
    },
  });
  if (!item || !requiresProductionPlanning(item)) {
    throw new Error("NOT_FOUND");
  }

  if (input.plannedStartAt && input.plannedEndAt) {
    if (new Date(input.plannedEndAt) < new Date(input.plannedStartAt)) {
      throw new Error("INVALID_DATES");
    }
  }

  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: item.orderId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  const itemIndex = orderItems.findIndex((oi) => oi.id === orderItemId);
  const planCode = buildProductionJobCode(item.order.orderNo, Math.max(0, itemIndex));

  const ownerId = canEditProductionPlan(session) ? (input.productionOwnerId ?? undefined) : undefined;

  const data = {
    planCode,
    priority: input.priority,
    plannedStartAt: input.plannedStartAt ? new Date(input.plannedStartAt) : input.plannedStartAt === null ? null : undefined,
    plannedEndAt: input.plannedEndAt ? new Date(input.plannedEndAt) : input.plannedEndAt === null ? null : undefined,
    internalDeadlineAt: input.internalDeadlineAt
      ? new Date(input.internalDeadlineAt)
      : input.internalDeadlineAt === null
        ? null
        : undefined,
    productionOwnerId: ownerId === undefined ? undefined : ownerId,
    productionTeamName: input.productionTeamName === undefined ? undefined : input.productionTeamName,
    estimatedLeadDays: input.estimatedLeadDays === undefined ? undefined : input.estimatedLeadDays,
    planningNote: input.planningNote === undefined ? undefined : input.planningNote,
    riskNote: input.riskNote === undefined ? undefined : input.riskNote,
    status: input.status,
  };

  await prisma.productionPlan.upsert({
    where: { orderItemId },
    create: {
      orderItemId,
      planCode,
      status: input.status ?? "READY_TO_START",
      priority: input.priority ?? "NORMAL",
      plannedStartAt: input.plannedStartAt ? new Date(input.plannedStartAt) : null,
      plannedEndAt: input.plannedEndAt ? new Date(input.plannedEndAt) : null,
      internalDeadlineAt: input.internalDeadlineAt ? new Date(input.internalDeadlineAt) : null,
      productionOwnerId: input.productionOwnerId ?? null,
      productionTeamName: input.productionTeamName ?? null,
      estimatedLeadDays: input.estimatedLeadDays ?? null,
      planningNote: input.planningNote ?? null,
      riskNote: input.riskNote ?? null,
    },
    update: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  });

  const detail = await getProductionPlanDetail(session, orderItemId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function getProductionBoard(
  session: AdminSessionUser,
  options?: { mine?: boolean },
): Promise<ProductionBoardResponse> {
  const now = new Date();
  let where = buildBaseItemWhere(session);
  if (options?.mine && session.employeeId) {
    where = {
      ...where,
      OR: [
        { productionPlan: { productionOwnerId: session.employeeId } },
        { order: { productionOwnerId: session.employeeId } },
      ],
    };
  }

  const items = await loadEligibleItems(where);
  const enriched = await enrichItems(items, now);
  const canViewCustomer = false;

  const columnKeys: ProductionBoardColumnKey[] = [
    "waiting_docs",
    "waiting_materials",
    "ready_to_start",
    "in_progress",
    "awaiting_qc",
    "rework",
    "completed",
  ];

  const columns = columnKeys.map((key) => ({
    key,
    label: PRODUCTION_BOARD_COLUMN_LABELS[key],
    cards: [] as ProductionBoardCard[],
  }));

  for (const e of enriched) {
    const row = toJobRow(e, session, canViewCustomer);
    const colKey = mapStatusToBoardColumn(e.status);
    const col = columns.find((c) => c.key === colKey);
    if (!col) continue;
    col.cards.push({
      orderItemId: row.orderItemId,
      jobCode: row.jobCode,
      orderNo: row.orderNo,
      productName: row.productName,
      quantity: row.quantity,
      quantityUnit: row.quantityUnit,
      internalDeadline: row.internalDeadline,
      ownerName: row.ownerName,
      risks: row.risks,
      riskTone: row.riskTone,
      priority: row.priority,
    });
  }

  return { columns };
}

export async function getProductionDashboard(
  session: AdminSessionUser,
): Promise<ProductionDashboardResponse> {
  const now = new Date();
  const scope = getPermissionScope(session, "production.view");
  const defaultMine = scope === "ASSIGNED";

  const items = await loadEligibleItems(buildBaseItemWhere(session));
  const enriched = await enrichItems(items, now);
  const canViewCustomer = getPermissionScope(session, "crm.view") !== "NONE";

  const toRow = (e: EnrichedJob) => toJobRow(e, session, canViewCustomer);

  const myJobs = session.employeeId
    ? enriched.filter((e) => matchesQuickFilter(e, "mine", session.employeeId)).map(toRow).slice(0, 8)
    : [];

  const upcomingDeadlines = [...enriched]
    .filter((e) => e.status !== "COMPLETED" && (e.item.productionPlan?.internalDeadlineAt || e.item.order.deliveryExpectedAt))
    .sort((a, b) => {
      const da = a.item.productionPlan?.internalDeadlineAt ?? a.item.order.deliveryExpectedAt!;
      const db = b.item.productionPlan?.internalDeadlineAt ?? b.item.order.deliveryExpectedAt!;
      return da.getTime() - db.getTime();
    })
    .slice(0, 8)
    .map(toRow);

  const ownerMap = new Map<string, { name: string; count: number }>();
  for (const e of enriched) {
    if (e.status === "COMPLETED") continue;
    const id = e.item.productionPlan?.productionOwnerId ?? e.item.order.productionOwnerId;
  const name =
      e.item.productionPlan?.productionOwner?.fullName ??
      e.item.order.productionOwnerName ??
      "Chưa phân công";
    if (!id) continue;
    const cur = ownerMap.get(id) ?? { name, count: 0 };
    ownerMap.set(id, { name: cur.name, count: cur.count + 1 });
  }

  const sections = [
    { key: "mine", label: "Việc của tôi", count: myJobs.length, href: "/admin/production/plan?mine=1" },
    {
      key: "not_planned",
      label: "Cần lập kế hoạch",
      count: enriched.filter((e) => !e.item.productionPlan).length,
      href: "/admin/production/plan?quickFilter=not_planned",
    },
    {
      key: "overdue",
      label: "Quá hạn",
      count: enriched.filter((e) => e.risks.includes("Quá hạn")).length,
      href: "/admin/production/plan?kpi=overdue",
    },
    {
      key: "at_risk",
      label: "Sắp trễ",
      count: enriched.filter((e) => e.risks.includes("Sắp trễ")).length,
      href: "/admin/production/plan?kpi=at_risk",
    },
    {
      key: "missing_docs",
      label: "Thiếu tài liệu",
      count: enriched.filter((e) => e.docStatus === "missing").length,
      href: "/admin/production/plan?kpi=missing_docs",
    },
    {
      key: "missing_materials",
      label: "Thiếu vật tư",
      count: enriched.filter((e) => e.materialStatus === "shortage").length,
      href: "/admin/production/plan?kpi=missing_materials",
    },
    {
      key: "awaiting_qc",
      label: "Chờ QC",
      count: enriched.filter((e) => e.status === "WAITING_QC").length,
      href: "/admin/production/plan?kpi=awaiting_qc",
    },
    {
      key: "rework",
      label: "Cần làm lại",
      count: enriched.filter((e) => e.status === "REWORK").length,
      href: "/admin/production/plan?quickFilter=in_progress",
    },
  ];

  return {
    sections,
    myJobs,
    upcomingDeadlines,
    ownerWorkload: [...ownerMap.entries()].map(([ownerId, v]) => ({
      ownerId,
      ownerName: v.name,
      count: v.count,
    })),
    defaultMine,
    canEditPlans: canEditProductionPlan(session),
  };
}
