import "server-only";

import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { buildScopedOrderWhere } from "@/features/auth/order-scope";
import { computeOrderFinancials } from "@/features/orders/order-finance";
import {
  batchGetProductionExecutionIndicators,
  type ProductionExecutionIndicators,
} from "@/features/orders/execution-board.service";
import {
  addDays,
  endOfDay,
  getProductionUrgency,
  startOfDay,
} from "@/features/orders/order-operations-helpers";
import type {
  OrderListDashboardParams,
  OrderListDashboardResponse,
  OrderListDashboardRow,
  OrderListDashboardSummary,
  OrderListKpiKey,
  OrderListQuickFilter,
} from "@/features/orders/order-list-dashboard.types";
import type { ProductionUrgency } from "@/features/orders/order-operations.types";
import { PRODUCT_PROGRESS_LABELS, mapReadinessToProgressBadge } from "@/features/orders/order-workspace-status";
import {
  aggregateOrderReadinessFromItems,
  evaluateOrderItemReadiness,
  itemHasDesignFile,
  type OrderItemReadinessState,
} from "@/features/orders/order-item-readiness";

const ACTIVE_STATUSES: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
];

type OrderRow = Prisma.OrderGetPayload<{
  include: {
    items: { include: { variants: true } };
    payments: true;
    deliveryOwner: { select: { fullName: true } };
    deliveryMethodRef: { select: { requiresCarrier: true } };
    productionOwner: { select: { fullName: true } };
    salesEmployee: { select: { fullName: true } };
  };
}>;

type EnrichedOrder = {
  row: OrderRow;
  execution: ProductionExecutionIndicators;
  activeFileCount: number;
  hasMaterialShortage: boolean;
  orderReadiness: OrderItemReadinessState;
  progressPercent: number | null;
};

function buildSearchWhere(search?: string): Prisma.OrderWhereInput {
  const term = search?.trim();
  if (!term) return {};
  return {
    OR: [
      { orderNo: { contains: term, mode: "insensitive" } },
      { sourceQuoteNo: { contains: term, mode: "insensitive" } },
      { customerCompanyName: { contains: term, mode: "insensitive" } },
      { contactName: { contains: term, mode: "insensitive" } },
      { salesName: { contains: term, mode: "insensitive" } },
      {
        items: {
          some: {
            OR: [
              { productNameSnapshot: { contains: term, mode: "insensitive" } },
              { skuSnapshot: { contains: term, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  };
}

function deliveryDeadlineRelative(expectedAt: Date | null, now: Date): {
  label: string;
  tone: OrderListDashboardRow["deliveryDeadlineTone"];
} {
  if (!expectedAt) return { label: "Chưa có deadline", tone: "muted" };
  const today = startOfDay(now);
  const due = startOfDay(expectedAt);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return { label: `Quá hạn ${Math.abs(diffDays)} ngày`, tone: "danger" };
  if (diffDays === 0) return { label: "Hôm nay", tone: "warn" };
  if (diffDays <= 3) return { label: `${diffDays} ngày nữa`, tone: "warn" };
  return { label: `${diffDays} ngày nữa`, tone: "default" };
}

function deliveryStateLabel(row: OrderRow, now: Date): string {
  if (row.status === "COMPLETED" || row.deliveredAt) return "Đã giao";
  if (row.status === "SHIPPED") return "Đang giao";
  if (row.status === "READY_TO_SHIP") return "Chuẩn bị giao";
  return "Chưa giao";
}

function progressFromReadiness(state: OrderItemReadinessState): {
  label: string;
  tone: OrderListDashboardRow["progressTone"];
} {
  const badge = mapReadinessToProgressBadge(state);
  const label =
    badge === "COMPLETED" ? "Sẵn sàng giao" : PRODUCT_PROGRESS_LABELS[badge];
  const tone: OrderListDashboardRow["progressTone"] =
    badge === "COMPLETED"
      ? "ok"
      : badge === "IN_PRODUCTION"
        ? "active"
        : badge === "WAITING_QC"
          ? "purple"
          : badge === "OVERDUE"
            ? "danger"
            : badge === "WAITING_DOCS"
              ? "warn"
              : "muted";
  return { label, tone };
}

function resolveOwner(row: OrderRow): { name: string | null; role: string | null } {
  if (row.status === "IN_PRODUCTION" || row.status === "CONFIRMED") {
    return {
      name: row.productionOwnerName ?? row.productionOwner?.fullName ?? null,
      role: row.productionOwnerName || row.productionOwnerId ? "Sản xuất" : null,
    };
  }
  if (row.status === "READY_TO_SHIP" || row.status === "SHIPPED") {
    return {
      name: row.deliveryOwner?.fullName ?? null,
      role: "Giao hàng",
    };
  }
  return {
    name: row.salesName ?? row.salesEmployee?.fullName ?? null,
    role: row.salesName || row.salesEmployeeId ? "Sales" : null,
  };
}

function buildWarnings(input: {
  row: OrderRow;
  execution: ProductionExecutionIndicators;
  activeFileCount: number;
  hasMaterialShortage: boolean;
  orderReadiness: OrderItemReadinessState;
  productionUrgency: ProductionUrgency;
  now: Date;
}): string[] {
  const warnings: string[] = [];
  const { row, execution, activeFileCount, hasMaterialShortage, orderReadiness, productionUrgency } =
    input;

  if (orderReadiness === "MISSING_DOCS" || (row.status === "IN_PRODUCTION" && activeFileCount === 0)) {
    warnings.push("Thiếu tài liệu");
  }
  if (hasMaterialShortage) warnings.push("Thiếu vật tư");
  if (execution.qcFilterKey === "no_qc" && row.status === "IN_PRODUCTION") {
    warnings.push("Chờ QC");
  }
  if (execution.qcFilterKey === "rework") warnings.push("Cần làm lại");
  if (
    (row.status === "IN_PRODUCTION" || row.status === "CONFIRMED") &&
    !row.productionOwnerId &&
    !row.productionOwnerName
  ) {
    warnings.push("Chưa phân công");
  }
  if (productionUrgency === "OVERDUE") warnings.push("Quá hạn");
  else if (
    row.deliveryExpectedAt &&
    row.deliveryExpectedAt < startOfDay(input.now) &&
    row.status !== "COMPLETED" &&
    !row.deliveredAt
  ) {
    warnings.push("Quá hạn");
  }

  return [...new Set(warnings)].slice(0, 3);
}

function matchesQuickFilter(
  enriched: EnrichedOrder,
  filter: OrderListQuickFilter,
  employeeId: string | null,
): boolean {
  const { row, execution, activeFileCount, hasMaterialShortage, orderReadiness } = enriched;
  switch (filter) {
    case "all":
      return true;
    case "mine":
      if (!employeeId) return false;
      return (
        row.salesEmployeeId === employeeId ||
        row.productionOwnerId === employeeId ||
        row.deliveryOwnerId === employeeId
      );
    case "in_production":
      return row.status === "IN_PRODUCTION";
    case "awaiting_qc":
      return row.status === "IN_PRODUCTION" && execution.qcFilterKey === "no_qc";
    case "missing_docs":
      return orderReadiness === "MISSING_DOCS" || (row.status === "IN_PRODUCTION" && activeFileCount === 0);
    case "missing_materials":
      return hasMaterialShortage;
    case "ready_to_ship":
      return row.status === "READY_TO_SHIP";
    case "overdue": {
      const urgency = getProductionUrgency(row.productionDueDate);
      const deliveryOverdue =
        Boolean(row.deliveryExpectedAt) &&
        row.deliveryExpectedAt! < startOfDay(new Date()) &&
        row.status !== "COMPLETED" &&
        !row.deliveredAt;
      return urgency === "OVERDUE" || deliveryOverdue;
    }
    default:
      return true;
  }
}

function matchesKpi(enriched: EnrichedOrder, kpi: OrderListKpiKey, now: Date): boolean {
  const { row, execution, activeFileCount, hasMaterialShortage, orderReadiness } = enriched;
  const warnings = buildWarnings({
    row,
    execution,
    activeFileCount,
    hasMaterialShortage,
    orderReadiness,
    productionUrgency: getProductionUrgency(row.productionDueDate, now),
    now,
  });

  switch (kpi) {
    case "in_production":
      return row.status === "IN_PRODUCTION";
    case "awaiting_qc":
      return row.status === "IN_PRODUCTION" && execution.qcFilterKey === "no_qc";
    case "ready_to_ship":
      return row.status === "READY_TO_SHIP";
    case "at_risk": {
      const prodRisk = getProductionUrgency(row.productionDueDate, now) === "UPCOMING";
      const deliveryRisk =
        Boolean(row.deliveryExpectedAt) &&
        row.deliveryExpectedAt! <= endOfDay(addDays(startOfDay(now), 3)) &&
        row.deliveryExpectedAt! >= startOfDay(now) &&
        row.status !== "COMPLETED" &&
        !row.deliveredAt;
      return prodRisk || deliveryRisk;
    }
    case "overdue": {
      const prodOver = getProductionUrgency(row.productionDueDate, now) === "OVERDUE";
      const deliveryOver =
        Boolean(row.deliveryExpectedAt) &&
        row.deliveryExpectedAt! < startOfDay(now) &&
        row.status !== "COMPLETED" &&
        !row.deliveredAt;
      return prodOver || deliveryOver;
    }
    case "needs_action":
      return warnings.length > 0;
    default:
      return true;
  }
}

async function batchActiveFileCounts(orderIds: string[]): Promise<Map<string, number>> {
  if (orderIds.length === 0) return new Map();
  const grouped = await prisma.orderProductionFile.groupBy({
    by: ["orderId"],
    where: { orderId: { in: orderIds }, status: "ACTIVE" },
    _count: { _all: true },
  });
  return new Map(
    grouped
      .filter((g): g is typeof g & { orderId: string } => Boolean(g.orderId))
      .map((g) => [g.orderId, g._count._all]),
  );
}

async function batchMaterialShortage(orderIds: string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  const requirements = await prisma.orderItemMaterialRequirement.findMany({
    where: { orderItem: { orderId: { in: orderIds } } },
    select: {
      orderItem: { select: { orderId: true } },
      materialId: true,
      requiredQuantity: true,
    },
  });
  const materialIds = [...new Set(requirements.map((r) => r.materialId).filter(Boolean))] as string[];
  const balances = materialIds.length
    ? await prisma.materialWarehouseBalance.findMany({
        where: { materialId: { in: materialIds } },
      })
    : [];
  const balanceByMaterial = new Map(balances.map((b) => [b.materialId, b.availableQuantity]));
  const shortageOrders = new Set<string>();
  for (const req of requirements) {
    if (!req.materialId) continue;
    const available = balanceByMaterial.get(req.materialId);
    if (available == null || available.lt(req.requiredQuantity)) {
      shortageOrders.add(req.orderItem.orderId);
    }
  }
  return shortageOrders;
}

async function batchOrderReadiness(rows: OrderRow[]): Promise<Map<string, OrderItemReadinessState>> {
  const orderIds = rows.map((r) => r.id);
  const result = new Map<string, OrderItemReadinessState>();
  if (orderIds.length === 0) return result;

  const [stages, qcs, files] = await Promise.all([
    prisma.orderProductionStage.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, orderItemId: true, stageType: true, status: true },
    }),
    prisma.orderQcInspection.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, orderItemId: true, status: true, passedQuantity: true },
    }),
    prisma.orderProductionFile.findMany({
      where: { orderId: { in: orderIds }, status: "ACTIVE" },
      select: { orderId: true, orderItemId: true, type: true, status: true },
    }),
  ]);

  for (const row of rows) {
    const itemStates: OrderItemReadinessState[] = [];
    for (const item of row.items) {
      const itemStages = stages.filter((s) => s.orderItemId === item.id);
      const itemQc = qcs.find((q) => q.orderItemId === item.id) ?? null;
      const itemFiles = files.filter((f) => f.orderItemId === item.id || (!f.orderItemId && f.orderId === row.id));
      const { state } = evaluateOrderItemReadiness({
        supplySource: item.supplySource,
        processingMethod: item.processingMethod,
        orderedQuantity: item.quantity,
        stages: itemStages.map((s) => ({
          id: "",
          orderId: row.id,
          orderItemId: s.orderItemId,
          stageType: s.stageType,
          stageTypeLabel: s.stageType,
          status: s.status,
          statusLabel: s.status,
          assignedEmployeeId: null,
          assignedEmployeeName: null,
          startedAt: null,
          completedAt: null,
          plannedQuantity: null,
          completedQuantity: "0",
          passedQuantity: "0",
          defectQuantity: "0",
          reworkQuantity: "0",
          scrapQuantity: "0",
          note: null,
          sortOrder: 0,
        })),
        qc: itemQc
          ? {
              id: "",
              orderId: row.id,
              orderItemId: itemQc.orderItemId,
              status: itemQc.status,
              statusLabel: itemQc.status,
              inspectedByEmployeeId: null,
              inspectedByEmployeeName: null,
              inspectedAt: null,
              inspectedQuantity: "0",
              passedQuantity: itemQc.passedQuantity.toString(),
              defectQuantity: "0",
              reworkQuantity: "0",
              scrapQuantity: "0",
              summary: null,
              correctiveAction: null,
              evidence: [],
              createdAt: "",
              updatedAt: "",
            }
          : null,
        activeFileCount: itemFiles.length,
        hasDesignFile: itemHasDesignFile(itemFiles),
      });
      itemStates.push(state);
    }
    result.set(row.id, aggregateOrderReadinessFromItems(itemStates));
  }
  return result;
}

async function enrichOrders(rows: OrderRow[], now: Date): Promise<EnrichedOrder[]> {
  const orderIds = rows.map((r) => r.id);
  const [executionMap, fileCounts, shortageOrders, readinessMap] = await Promise.all([
    batchGetProductionExecutionIndicators(rows.map((r) => ({ id: r.id, status: r.status }))),
    batchActiveFileCounts(orderIds),
    batchMaterialShortage(orderIds),
    batchOrderReadiness(rows),
  ]);

  return rows.map((row) => {
    const execution = executionMap.get(row.id)!;
    const progressPercent =
      execution.stageApplicableCount > 0
        ? Math.round((execution.stageCompletedCount / execution.stageApplicableCount) * 100)
        : null;
    return {
      row,
      execution,
      activeFileCount: fileCounts.get(row.id) ?? 0,
      hasMaterialShortage: shortageOrders.has(row.id),
      orderReadiness: readinessMap.get(row.id) ?? "AWAITING_PRODUCTION",
      progressPercent,
    };
  });
}

function mapDashboardRow(enriched: EnrichedOrder, now: Date, canViewFinancials: boolean): OrderListDashboardRow {
  const { row, orderReadiness, progressPercent } = enriched;
  const sortedItems = [...row.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const thumbnails = sortedItems
    .map((i) => i.designImageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 2);
  const totalQuantity = row.items.reduce((sum, i) => sum + i.quantity, 0);
  const productionUrgency = getProductionUrgency(row.productionDueDate, now);
  const deadline = deliveryDeadlineRelative(row.deliveryExpectedAt, now);
  const progress = progressFromReadiness(orderReadiness);
  const owner = resolveOwner(row);
  const warnings = buildWarnings({ ...enriched, productionUrgency, now });

  const payments = row.payments.map((p) => ({
    type: p.type,
    status: p.status,
    amount: p.amount.toNumber(),
  }));
  const financials = computeOrderFinancials(row.totalAmount.toNumber(), payments);

  const base: OrderListDashboardRow = {
    id: row.id,
    orderNo: row.orderNo,
    createdAt: row.createdAt.toISOString(),
    customerId: row.customerId,
    customerCompanyName: row.customerCompanyName,
    contactName: row.contactName,
    status: row.status,
    productCount: row.items.length,
    totalQuantity,
    quantityUnit: sortedItems[0]?.unit ?? null,
    productThumbnails: thumbnails,
    deliveryExpectedAt: row.deliveryExpectedAt?.toISOString() ?? null,
    deliveryDeadlineRelative: deadline.label,
    deliveryDeadlineTone: deadline.tone,
    progressPercent,
    progressLabel: progress.label,
    progressTone: progress.tone,
    ownerName: owner.name,
    ownerRole: owner.role,
    deliveryMethodLabel: row.deliveryMethodName ?? row.deliveryMethod,
    deliveryStateLabel: deliveryStateLabel(row, now),
    warnings,
    productionUrgency,
  };

  if (!canViewFinancials) return base;
  return {
    ...base,
    totalAmount: row.totalAmount.toNumber(),
    paidAmount: financials.paidAmount,
    outstandingAmount: financials.outstandingAmount,
    paymentState: financials.paymentState,
  };
}

function buildSummary(
  enrichedAll: EnrichedOrder[],
  now: Date,
  employeeId: string | null,
): OrderListDashboardSummary {
  const kpiDefs: Array<{
    key: OrderListKpiKey;
    label: string;
    tone: OrderListDashboardSummary["kpis"][number]["tone"];
  }> = [
    { key: "in_production", label: "Đang sản xuất", tone: "blue" },
    { key: "awaiting_qc", label: "Chờ QC", tone: "purple" },
    { key: "ready_to_ship", label: "Sẵn sàng giao", tone: "green" },
    { key: "at_risk", label: "Có nguy cơ trễ", tone: "orange" },
    { key: "overdue", label: "Quá hạn", tone: "red" },
    { key: "needs_action", label: "Cần xử lý", tone: "slate" },
  ];

  const kpis = kpiDefs.map((def) => ({
    key: def.key,
    label: def.label,
    tone: def.tone,
    count: enrichedAll.filter((e) => matchesKpi(e, def.key, now)).length,
  }));

  const chipDefs: Array<{ key: OrderListQuickFilter; label: string }> = [
    { key: "all", label: "Tất cả" },
    { key: "mine", label: "Việc của tôi" },
    { key: "in_production", label: "Đang sản xuất" },
    { key: "awaiting_qc", label: "Chờ QC" },
    { key: "missing_docs", label: "Thiếu tài liệu" },
    { key: "missing_materials", label: "Thiếu vật tư" },
    { key: "ready_to_ship", label: "Sẵn sàng giao" },
    { key: "overdue", label: "Quá hạn" },
  ];

  const quickFilters = chipDefs.map((def) => ({
    key: def.key,
    label: def.label,
    count:
      def.key === "all"
        ? enrichedAll.length
        : enrichedAll.filter((e) => matchesQuickFilter(e, def.key, employeeId)).length,
  }));

  return { kpis, quickFilters };
}

const orderInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { variants: { orderBy: { sortOrder: "asc" as const } } },
  },
  payments: true,
  deliveryOwner: { select: { fullName: true } },
  deliveryMethodRef: { select: { requiresCarrier: true } },
  productionOwner: { select: { fullName: true } },
  salesEmployee: { select: { fullName: true } },
};

export async function listOrderDashboard(
  session: AdminSessionUser,
  params: OrderListDashboardParams,
  options?: { canViewFinancials: boolean; canCreateOrders: boolean },
): Promise<OrderListDashboardResponse> {
  const now = new Date();
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  const scopeWhere = buildScopedOrderWhere(session, "orders.view");
  const employeeId = session.employeeId ?? null;
  const canViewFinancials = options?.canViewFinancials ?? false;

  const baseWhere: Prisma.OrderWhereInput = {
    AND: [
      scopeWhere,
      { status: { in: ACTIVE_STATUSES } },
      buildSearchWhere(params.search),
      params.status ? { status: params.status } : {},
      params.mine && employeeId
        ? {
            OR: [
              { salesEmployeeId: employeeId },
              { productionOwnerId: employeeId },
              { deliveryOwnerId: employeeId },
            ],
          }
        : {},
    ],
  };

  const [rows, scopeRows] = await Promise.all([
    prisma.order.findMany({
      where: baseWhere,
      include: orderInclude,
      orderBy: [{ productionDueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.order.findMany({
      where: { AND: [scopeWhere, { status: { in: ACTIVE_STATUSES } }] },
      include: orderInclude,
    }),
  ]);

  let enrichedAll = await enrichOrders(rows, now);
  const summarySource = await enrichOrders(scopeRows, now);

  if (params.quickFilter && params.quickFilter !== "all") {
    enrichedAll = enrichedAll.filter((e) => matchesQuickFilter(e, params.quickFilter!, employeeId));
  }
  if (params.kpi) {
    enrichedAll = enrichedAll.filter((e) => matchesKpi(e, params.kpi!, now));
  }
  if (params.paymentState && canViewFinancials) {
    enrichedAll = enrichedAll.filter((e) => {
      const payments = e.row.payments.map((p) => ({
        type: p.type,
        status: p.status,
        amount: p.amount.toNumber(),
      }));
      const financials = computeOrderFinancials(e.row.totalAmount.toNumber(), payments);
      return financials.paymentState === params.paymentState;
    });
  }

  const summary = buildSummary(summarySource, now, employeeId);
  const total = enrichedAll.length;
  const start = (page - 1) * pageSize;
  const pageRows = enrichedAll.slice(start, start + pageSize);
  const orders = pageRows.map((e) => mapDashboardRow(e, now, canViewFinancials));

  return {
    orders,
    total,
    page,
    pageSize,
    summary,
    permissions: {
      canViewFinancials,
      canCreateOrders: options?.canCreateOrders ?? false,
      employeeId,
    },
  };
}
