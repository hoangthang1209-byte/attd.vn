import type { PricingCostingBatchStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildCostingWorkspaceClone,
  costingWorkspaceToCalculatorInput,
  parseCostingCalculatorInputSnapshot,
  type CostingCalculationCloneRecord,
} from "@/features/pricing/costing-calculation-clone";
import { generateCostingBatchCode } from "@/features/pricing/costing-batch-code";
import { computeSellingPriceCommercials } from "@/features/pricing/costing-batch-selling-price";
import { formatRevisionDisplayLabel } from "@/features/pricing/pricing-calculation-revision";
import { finalizePricingCalculation } from "@/features/pricing/services/pricing-calculation.service";
import {
  calculateCosting,
  saveCostingCalculation,
} from "@/features/pricing/services/costing-calculator.service";
import type { CostingCalculatorInput } from "@/features/pricing/costing-types";
import { createQuoteFromPricingCalculations } from "@/features/quotes/quote.service";

export class CostingBatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostingBatchValidationError";
  }
}

export type CostingBatchRowView = {
  itemId: string;
  sortOrder: number;
  groupLabel: string | null;
  label: string | null;
  calculationId: string | null;
  calculationCode: string | null;
  productId: string | null;
  variantId: string | null;
  customProductName: string | null;
  productName: string;
  quantity: number | null;
  unit: string | null;
  costPerUnit: number | null;
  totalCost: number | null;
  sellingPricePerUnit: number | null;
  revenue: number | null;
  profit: number | null;
  marginRate: number | null;
  revisionLabel: string | null;
  revisionDisplay: string | null;
  isFinal: boolean;
  calculationStatus: string | null;
  isIncomplete: boolean;
};

export type CostingBatchDetail = {
  id: string;
  code: string;
  title: string | null;
  status: PricingCostingBatchStatus;
  internalNote: string | null;
  quoteId: string | null;
  quoteNo: string | null;
  createdAt: string;
  updatedAt: string;
  lead: { id: string; fullName: string; code: string | null } | null;
  customer: { id: string; name: string; code: string } | null;
  contact: { id: string; fullName: string } | null;
  rows: CostingBatchRowView[];
  totals: {
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageMarginRate: number | null;
  };
};

function mapRowView(item: {
  id: string;
  sortOrder: number;
  groupLabel: string | null;
  label: string | null;
  pricingCalculation: {
    id: string;
    code: string;
    status: string;
    isFinal: boolean;
    revisionLabel: string | null;
    items: Array<{
      quantity: number;
      unit: string;
      productId: string | null;
      variantId: string | null;
      productNameSnapshot: string | null;
      costEstimate: Prisma.Decimal | null;
      unitPrice: Prisma.Decimal;
      manualOverride: boolean;
      manualUnitPrice: Prisma.Decimal | null;
      marginAmount: Prisma.Decimal | null;
      marginRate: Prisma.Decimal | null;
      lineTotal: Prisma.Decimal;
      pricingSnapshot: unknown;
    }>;
  } | null;
}): CostingBatchRowView {
  const calc = item.pricingCalculation;
  const line = calc?.items[0];
  const productName =
    line?.productNameSnapshot?.trim() ||
    item.label?.trim() ||
    "—";

  if (!calc || !line) {
    return {
      itemId: item.id,
      sortOrder: item.sortOrder,
      groupLabel: item.groupLabel,
      label: item.label,
      calculationId: null,
      calculationCode: null,
      productId: null,
      variantId: null,
      customProductName: item.label?.trim() || null,
      productName,
      quantity: null,
      unit: null,
      costPerUnit: null,
      totalCost: null,
      sellingPricePerUnit: null,
      revenue: null,
      profit: null,
      marginRate: null,
      revisionLabel: null,
      revisionDisplay: null,
      isFinal: false,
      calculationStatus: null,
      isIncomplete: true,
    };
  }

  const quantity = line.quantity;
  const costEstimate = line.costEstimate?.toNumber() ?? null;
  const sellingPricePerUnit =
    line.manualOverride && line.manualUnitPrice != null
      ? line.manualUnitPrice.toNumber()
      : line.unitPrice.toNumber();
  const revenue = line.lineTotal.toNumber();
  const profit = line.marginAmount?.toNumber() ?? null;
  const marginRate = line.marginRate?.toNumber() ?? null;
  const snapshot = line.pricingSnapshot as { totalCostPerUnit?: number } | null;
  const costPerUnit =
    costEstimate != null && quantity > 0
      ? Math.round((costEstimate / quantity) * 100) / 100
      : snapshot?.totalCostPerUnit ?? null;

  return {
    itemId: item.id,
    sortOrder: item.sortOrder,
    groupLabel: item.groupLabel,
    label: item.label,
    calculationId: calc.id,
    calculationCode: calc.code,
    productId: line.productId,
    variantId: line.variantId,
    customProductName: line.productId ? null : line.productNameSnapshot?.trim() || null,
    productName,
    quantity,
    unit: line.unit,
    costPerUnit,
    totalCost: costEstimate,
    sellingPricePerUnit,
    revenue,
    profit,
    marginRate,
    revisionLabel: calc.revisionLabel,
    revisionDisplay: formatRevisionDisplayLabel(calc.revisionLabel, 1, calc.isFinal),
    isFinal: calc.isFinal,
    calculationStatus: calc.status,
    isIncomplete: false,
  };
}

function computeBatchTotals(rows: CostingBatchRowView[]) {
  let totalQuantity = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let hasCostRows = false;

  for (const row of rows) {
    if (row.quantity != null) totalQuantity += row.quantity;
    if (row.revenue != null) totalRevenue += row.revenue;
    if (row.totalCost != null) {
      totalCost += row.totalCost;
      hasCostRows = true;
    }
  }

  const totalProfit = hasCostRows ? roundMoney(totalRevenue - totalCost) : 0;
  const averageMarginRate =
    hasCostRows && totalRevenue > 0 ? roundMoney((totalProfit / totalRevenue) * 100) : null;

  return {
    totalQuantity,
    totalRevenue: roundMoney(totalRevenue),
    totalCost: hasCostRows ? roundMoney(totalCost) : 0,
    totalProfit: hasCostRows ? totalProfit : 0,
    averageMarginRate,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function listCostingBatches(limit = 50) {
  const rows = await prisma.pricingCostingBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: { select: { name: true } },
      items: { select: { id: true } },
      quote: { select: { quoteNo: true } },
    },
  });

  return {
    batches: rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      customerLabel: row.customer?.name ?? null,
      itemCount: row.items.length,
      quoteNo: row.quote?.quoteNo ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getCostingBatchDetail(id: string): Promise<CostingBatchDetail | null> {
  const row = await prisma.pricingCostingBatch.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, fullName: true, code: true } },
      customer: { select: { id: true, name: true, code: true } },
      contact: { select: { id: true, fullName: true } },
      quote: { select: { id: true, quoteNo: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          pricingCalculation: {
            include: {
              items: { orderBy: { createdAt: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  const rows = row.items.map(mapRowView);
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status,
    internalNote: row.internalNote,
    quoteId: row.quoteId,
    quoteNo: row.quote?.quoteNo ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lead: row.lead,
    customer: row.customer,
    contact: row.contact,
    rows,
    totals: computeBatchTotals(rows),
  };
}

export async function createCostingBatch(input: {
  title?: string;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  internalNote?: string;
}) {
  const code = await generateCostingBatchCode();
  const batch = await prisma.pricingCostingBatch.create({
    data: {
      code,
      title: input.title?.trim() || null,
      leadId: input.leadId || null,
      customerId: input.customerId || null,
      contactId: input.contactId || null,
      internalNote: input.internalNote?.trim() || null,
    },
  });
  return getCostingBatchDetail(batch.id);
}

export async function updateCostingBatch(
  id: string,
  input: {
    title?: string;
    leadId?: string | null;
    customerId?: string | null;
    contactId?: string | null;
    internalNote?: string | null;
  },
) {
  const existing = await prisma.pricingCostingBatch.findUnique({ where: { id } });
  if (!existing) throw new CostingBatchValidationError("Không tìm thấy batch costing.");

  await prisma.pricingCostingBatch.update({
    where: { id },
    data: {
      title: input.title !== undefined ? input.title?.trim() || null : undefined,
      leadId: input.leadId !== undefined ? input.leadId : undefined,
      customerId: input.customerId !== undefined ? input.customerId : undefined,
      contactId: input.contactId !== undefined ? input.contactId : undefined,
      internalNote: input.internalNote !== undefined ? input.internalNote?.trim() || null : undefined,
    },
  });

  return getCostingBatchDetail(id);
}

export async function addCostingBatchItem(
  batchId: string,
  input?: { label?: string; groupLabel?: string },
) {
  const batch = await prisma.pricingCostingBatch.findUnique({
    where: { id: batchId },
    include: { items: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!batch) throw new CostingBatchValidationError("Không tìm thấy batch costing.");

  const nextSort = (batch.items[0]?.sortOrder ?? -1) + 1;
  await prisma.pricingCostingBatchItem.create({
    data: {
      batchId,
      sortOrder: nextSort,
      label: input?.label?.trim() || null,
      groupLabel: input?.groupLabel?.trim() || null,
    },
  });

  return getCostingBatchDetail(batchId);
}

export async function updateCostingBatchItem(
  batchId: string,
  itemId: string,
  input: { label?: string | null; groupLabel?: string | null },
) {
  const item = await prisma.pricingCostingBatchItem.findFirst({
    where: { id: itemId, batchId },
  });
  if (!item) throw new CostingBatchValidationError("Không tìm thấy dòng batch.");

  await prisma.pricingCostingBatchItem.update({
    where: { id: itemId },
    data: {
      label: input.label !== undefined ? input.label?.trim() || null : undefined,
      groupLabel: input.groupLabel !== undefined ? input.groupLabel?.trim() || null : undefined,
    },
  });

  return getCostingBatchDetail(batchId);
}

export async function linkBatchItemToCalculation(batchItemId: string, calculationId: string) {
  const item = await prisma.pricingCostingBatchItem.findUnique({
    where: { id: batchItemId },
    include: { batch: true },
  });
  if (!item) throw new CostingBatchValidationError("Không tìm thấy dòng batch.");

  const calc = await prisma.pricingCalculation.findUnique({
    where: { id: calculationId },
    include: { items: { take: 1 } },
  });
  if (!calc) throw new CostingBatchValidationError("Không tìm thấy bản tính giá.");

  const existingLink = await prisma.pricingCostingBatchItem.findUnique({
    where: { pricingCalculationId: calculationId },
  });
  if (existingLink && existingLink.id !== batchItemId) {
    throw new CostingBatchValidationError("Bản tính giá đã được gắn với dòng batch khác.");
  }

  await prisma.pricingCostingBatchItem.update({
    where: { id: batchItemId },
    data: {
      pricingCalculationId: calculationId,
      label: calc.items[0]?.productNameSnapshot ?? item.label,
    },
  });

  return getCostingBatchDetail(item.batchId);
}

export async function updateBatchRowSellingPrice(
  batchId: string,
  itemId: string,
  sellingPricePerUnit: number,
) {
  if (!Number.isFinite(sellingPricePerUnit) || sellingPricePerUnit < 0) {
    throw new CostingBatchValidationError("Giá bán / SP phải >= 0.");
  }

  const item = await prisma.pricingCostingBatchItem.findFirst({
    where: { id: itemId, batchId },
    include: {
      pricingCalculation: {
        include: { items: { take: 1 } },
      },
    },
  });
  if (!item?.pricingCalculationId || !item.pricingCalculation) {
    throw new CostingBatchValidationError("Dòng chưa có bản tính giá.");
  }

  const calcItem = item.pricingCalculation.items[0];
  if (!calcItem) throw new CostingBatchValidationError("Bản tính giá không có dòng sản phẩm.");

  const costEstimate = calcItem.costEstimate?.toNumber() ?? 0;
  const commercials = computeSellingPriceCommercials({
    quantity: calcItem.quantity,
    costEstimate,
    sellingPricePerUnit,
  });

  await prisma.$transaction(async (tx) => {
    await tx.pricingCalculationItem.update({
      where: { id: calcItem.id },
      data: {
        manualOverride: true,
        manualUnitPrice: commercials.sellingPricePerUnit,
        unitPrice: commercials.sellingPricePerUnit,
        baseUnitPrice: commercials.sellingPricePerUnit,
        lineSubtotal: commercials.revenue,
        lineTotal: commercials.revenue,
        marginAmount: commercials.profit,
        marginRate: commercials.marginRate,
        manualOverrideReason: "Giá bán thương mại (batch)",
      },
    });

    await tx.pricingCalculation.update({
      where: { id: item.pricingCalculationId! },
      data: {
        subtotal: commercials.revenue,
        totalAmount: commercials.revenue,
        manualOverride: true,
        manualTotalAmount: commercials.revenue,
      },
    });
  });

  return getCostingBatchDetail(batchId);
}

async function loadCloneRecord(calculationId: string): Promise<CostingCalculationCloneRecord> {
  const calc = await prisma.pricingCalculation.findUnique({
    where: { id: calculationId },
    include: {
      items: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!calc) throw new CostingBatchValidationError("Không tìm thấy bản tính giá nguồn.");

  return {
    id: calc.id,
    code: calc.code,
    revisionLabel: calc.revisionLabel,
    isFinal: calc.isFinal,
    inputSnapshot: calc.inputSnapshot,
    resultSnapshot: calc.resultSnapshot,
    internalNote: calc.internalNote,
    leadId: calc.leadId,
    customerId: calc.customerId,
    contactId: calc.contactId,
    priceGroupId: calc.priceGroupId,
    items: calc.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      pricingSnapshot: item.pricingSnapshot,
    })),
  };
}

export async function cloneCostingBatchRow(
  batchId: string,
  sourceItemId: string,
  target?: { label?: string; groupLabel?: string },
) {
  const sourceItem = await prisma.pricingCostingBatchItem.findFirst({
    where: { id: sourceItemId, batchId },
    include: { batch: true },
  });
  if (!sourceItem?.pricingCalculationId) {
    throw new CostingBatchValidationError("Dòng nguồn chưa có bản tính giá để nhân bản.");
  }

  const cloneRecord = await loadCloneRecord(sourceItem.pricingCalculationId);
  const workspace = buildCostingWorkspaceClone(cloneRecord);
  if (!workspace) throw new CostingBatchValidationError("Không thể đọc dữ liệu costing nguồn.");

  if (target?.label?.trim()) {
    workspace.customProductName = target.label.trim();
  }

  const input = costingWorkspaceToCalculatorInput(workspace, {
    leadId: sourceItem.batch.leadId ?? undefined,
    customerId: sourceItem.batch.customerId ?? undefined,
    contactId: sourceItem.batch.contactId ?? undefined,
    internalNote: workspace.internalNote,
  });

  const saved = await saveCostingCalculation(input);

  const maxSort = await prisma.pricingCostingBatchItem.aggregate({
    where: { batchId },
    _max: { sortOrder: true },
  });

  const newItem = await prisma.pricingCostingBatchItem.create({
    data: {
      batchId,
      pricingCalculationId: saved.calculationId,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      groupLabel: target?.groupLabel?.trim() || sourceItem.groupLabel,
      label: target?.label?.trim() || workspace.customProductName || sourceItem.label,
    },
  });

  return { batch: await getCostingBatchDetail(batchId), newItemId: newItem.id };
}

export async function cloneCostingBatchRowToTargets(
  batchId: string,
  sourceItemId: string,
  targets: Array<{ label: string; groupLabel?: string }>,
) {
  if (!targets.length) throw new CostingBatchValidationError("Cần ít nhất một style đích.");
  const results = [];
  for (const target of targets) {
    const result = await cloneCostingBatchRow(batchId, sourceItemId, target);
    results.push(result);
  }
  return getCostingBatchDetail(batchId);
}

export async function finalizeCostingBatchRow(batchId: string, itemId: string) {
  const item = await prisma.pricingCostingBatchItem.findFirst({
    where: { id: itemId, batchId },
  });
  if (!item?.pricingCalculationId) {
    throw new CostingBatchValidationError("Dòng chưa có bản tính giá.");
  }
  await finalizePricingCalculation(item.pricingCalculationId);
  return getCostingBatchDetail(batchId);
}

export async function createQuoteFromCostingBatch(
  batchId: string,
  itemIds?: string[],
) {
  const batch = await prisma.pricingCostingBatch.findUnique({
    where: { id: batchId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!batch) throw new CostingBatchValidationError("Không tìm thấy batch costing.");
  if (batch.quoteId) {
    throw new CostingBatchValidationError("Batch đã có báo giá. Tạo báo giá mới từ batch đã quoted không được phép.");
  }

  const selected =
    itemIds?.length
      ? batch.items.filter((item) => itemIds.includes(item.id))
      : batch.items;

  const calculationIds = selected
    .map((item) => item.pricingCalculationId)
    .filter((id): id is string => Boolean(id));

  if (!calculationIds.length) {
    throw new CostingBatchValidationError("Không có dòng đã tính giá để tạo báo giá.");
  }

  const quote = await createQuoteFromPricingCalculations(calculationIds, {
    leadId: batch.leadId,
    customerId: batch.customerId,
    contactId: batch.contactId,
    title: batch.title?.trim() || `Báo giá ${batch.code}`,
    internalNote: batch.internalNote,
  });

  if (!quote) throw new CostingBatchValidationError("Không thể tạo báo giá.");

  await prisma.pricingCostingBatch.update({
    where: { id: batchId },
    data: {
      quoteId: quote.id,
      status: "QUOTED",
    },
  });

  return { quote, batch: await getCostingBatchDetail(batchId) };
}

export type PersistCostingBatchRowInput = {
  productId?: string | null;
  variantId?: string | null;
  customProductName?: string | null;
  quantity: number;
  groupLabel?: string | null;
  sellingPricePerUnit?: number;
};

async function loadBatchContext(batchId: string) {
  const batch = await prisma.pricingCostingBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new CostingBatchValidationError("Không tìm thấy batch costing.");
  return batch;
}

function buildCalculatorInputFromBatch(
  batch: { leadId: string | null; customerId: string | null; contactId: string | null },
  input: PersistCostingBatchRowInput,
  base?: CostingCalculatorInput | null,
): CostingCalculatorInput {
  const productId = input.productId ?? base?.productId ?? undefined;
  const customProductName = productId
    ? undefined
    : (input.customProductName?.trim() || base?.customProductName?.trim() || undefined);

  return {
    ...base,
    productId,
    variantId: input.variantId ?? base?.variantId ?? undefined,
    customProductName,
    quantity: Math.max(1, Math.round(input.quantity)),
    unit: base?.unit ?? "cái",
    leadId: batch.leadId ?? base?.leadId ?? undefined,
    customerId: batch.customerId ?? base?.customerId ?? undefined,
    contactId: batch.contactId ?? base?.contactId ?? undefined,
  };
}

async function applyCalculationResultToWorkingRow(
  calculationId: string,
  calcItemId: string,
  result: Awaited<ReturnType<typeof calculateCosting>>,
  inputSnapshot: CostingCalculatorInput,
  sellingPricePerUnit?: number,
) {
  const useManualSell = sellingPricePerUnit != null && Number.isFinite(sellingPricePerUnit);
  const commercials = useManualSell
    ? computeSellingPriceCommercials({
        quantity: result.quantity,
        costEstimate: result.totalCost,
        sellingPricePerUnit,
      })
    : null;

  const unitPrice = commercials?.sellingPricePerUnit ?? result.suggestedSellingPricePerUnit;
  const revenue = commercials?.revenue ?? result.revenueBeforeVat;
  const profit = commercials?.profit ?? result.grossProfit;
  const marginRate = commercials?.marginRate ?? result.actualMarginRate;

  await prisma.$transaction(async (tx) => {
    await tx.pricingCalculationItem.update({
      where: { id: calcItemId },
      data: {
        productId: result.productId,
        variantId: result.variantId,
        productNameSnapshot: result.productName,
        variantNameSnapshot: result.variantName,
        quantity: result.quantity,
        unit: result.unit,
        baseUnitPrice: unitPrice,
        unitPrice,
        lineSubtotal: revenue,
        lineTotal: revenue,
        costEstimate: result.totalCost,
        marginAmount: profit,
        marginRate,
        pricingSnapshot: { ...result } as unknown as Prisma.InputJsonValue,
        manualOverride: useManualSell,
        manualUnitPrice: useManualSell ? unitPrice : null,
        manualOverrideReason: useManualSell ? "Giá bán thương mại (batch)" : null,
      },
    });

    await tx.pricingCalculation.update({
      where: { id: calculationId },
      data: {
        subtotal: revenue,
        totalAmount: result.finalQuotePrice,
        manualOverride: useManualSell,
        manualTotalAmount: useManualSell ? revenue : null,
        inputSnapshot: { calculator: "costing", ...inputSnapshot } as Prisma.InputJsonValue,
        resultSnapshot: { calculator: "costing", ...result } as unknown as Prisma.InputJsonValue,
      },
    });
  });
}

export async function persistCostingBatchRow(
  batchId: string,
  input: PersistCostingBatchRowInput,
  existingItemId?: string,
) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new CostingBatchValidationError("Số lượng phải > 0.");
  }
  if (!input.productId && !input.customProductName?.trim()) {
    throw new CostingBatchValidationError("Cần style hoặc sản phẩm catalog.");
  }

  const batch = await loadBatchContext(batchId);
  let batchItemId = existingItemId;

  if (batchItemId) {
    const existing = await prisma.pricingCostingBatchItem.findFirst({
      where: { id: batchItemId, batchId },
    });
    if (!existing) throw new CostingBatchValidationError("Không tìm thấy dòng batch.");
    if (existing.pricingCalculationId) {
      throw new CostingBatchValidationError("Dòng đã có bản tính giá — dùng cập nhật inline.");
    }
    await prisma.pricingCostingBatchItem.update({
      where: { id: batchItemId },
      data: {
        groupLabel: input.groupLabel?.trim() || null,
        label: input.customProductName?.trim() || existing.label,
      },
    });
  } else {
    const maxSort = await prisma.pricingCostingBatchItem.aggregate({
      where: { batchId },
      _max: { sortOrder: true },
    });
    const created = await prisma.pricingCostingBatchItem.create({
      data: {
        batchId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        groupLabel: input.groupLabel?.trim() || null,
        label: input.customProductName?.trim() || null,
      },
    });
    batchItemId = created.id;
  }

  const calculatorInput = buildCalculatorInputFromBatch(batch, input);
  await saveCostingCalculation(calculatorInput, { batchItemId });

  if (input.groupLabel !== undefined) {
    await prisma.pricingCostingBatchItem.update({
      where: { id: batchItemId },
      data: {
        groupLabel: input.groupLabel?.trim() || null,
        label: input.customProductName?.trim() || input.groupLabel?.trim() || null,
      },
    });
  }

  if (input.sellingPricePerUnit != null) {
    await updateBatchRowSellingPrice(batchId, batchItemId, input.sellingPricePerUnit);
  }

  return getCostingBatchDetail(batchId);
}

export async function persistCostingBatchRows(
  batchId: string,
  rows: PersistCostingBatchRowInput[],
) {
  if (!rows.length) throw new CostingBatchValidationError("Không có dòng để lưu.");
  for (const row of rows) {
    await persistCostingBatchRow(batchId, row);
  }
  return getCostingBatchDetail(batchId);
}

export async function updateCostingBatchRowFields(
  batchId: string,
  itemId: string,
  input: {
    productId?: string | null;
    variantId?: string | null;
    customProductName?: string | null;
    quantity?: number;
    groupLabel?: string | null;
    sellingPricePerUnit?: number;
  },
) {
  const item = await prisma.pricingCostingBatchItem.findFirst({
    where: { id: itemId, batchId },
    include: {
      pricingCalculation: {
        include: { items: { orderBy: { createdAt: "asc" }, take: 1 } },
      },
    },
  });
  if (!item) throw new CostingBatchValidationError("Không tìm thấy dòng batch.");

  if (!item.pricingCalculationId || !item.pricingCalculation) {
    return persistCostingBatchRow(
      batchId,
      {
        productId: input.productId,
        variantId: input.variantId,
        customProductName: input.customProductName,
        quantity: input.quantity ?? 1,
        groupLabel: input.groupLabel,
        sellingPricePerUnit: input.sellingPricePerUnit,
      },
      itemId,
    );
  }

  const calc = item.pricingCalculation;
  const calcItem = calc.items[0];
  if (!calcItem) throw new CostingBatchValidationError("Bản tính giá không có dòng sản phẩm.");

  const structuralChange =
    input.productId !== undefined ||
    input.variantId !== undefined ||
    input.customProductName !== undefined ||
    input.quantity !== undefined;

  if (calc.isFinal && structuralChange) {
    throw new CostingBatchValidationError(
      "Bản tính giá FINAL không thể sửa style/số lượng inline. Tạo phiên bản mới từ Tính giá.",
    );
  }

  if (input.groupLabel !== undefined) {
    await prisma.pricingCostingBatchItem.update({
      where: { id: itemId },
      data: { groupLabel: input.groupLabel?.trim() || null },
    });
  }

  if (input.sellingPricePerUnit != null && !structuralChange) {
    return updateBatchRowSellingPrice(batchId, itemId, input.sellingPricePerUnit);
  }

  if (!structuralChange) {
    return getCostingBatchDetail(batchId);
  }

  const batch = await loadBatchContext(batchId);
  const existingInput =
    parseCostingCalculatorInputSnapshot(calc.inputSnapshot) ?? { quantity: calcItem.quantity };
  const merged = buildCalculatorInputFromBatch(batch, {
    productId: input.productId ?? calcItem.productId,
    variantId: input.variantId ?? calcItem.variantId,
    customProductName: input.customProductName ?? calcItem.productNameSnapshot,
    quantity: input.quantity ?? calcItem.quantity,
  }, existingInput);

  const result = await calculateCosting(merged);

  const sellingPrice =
    input.sellingPricePerUnit ??
    (calcItem.manualOverride && calcItem.manualUnitPrice
      ? calcItem.manualUnitPrice.toNumber()
      : undefined);

  await applyCalculationResultToWorkingRow(
    calc.id,
    calcItem.id,
    result,
    merged,
    sellingPrice,
  );

  await prisma.pricingCostingBatchItem.update({
    where: { id: itemId },
    data: {
      label: result.productName,
      groupLabel:
        input.groupLabel !== undefined ? input.groupLabel?.trim() || null : item.groupLabel,
    },
  });

  if (input.sellingPricePerUnit != null) {
    await updateBatchRowSellingPrice(batchId, itemId, input.sellingPricePerUnit);
  }

  return getCostingBatchDetail(batchId);
}

export async function removeCostingBatchItem(batchId: string, itemId: string) {
  const item = await prisma.pricingCostingBatchItem.findFirst({
    where: { id: itemId, batchId },
    include: { pricingCalculation: { select: { isFinal: true } } },
  });
  if (!item) throw new CostingBatchValidationError("Không tìm thấy dòng batch.");

  if (item.pricingCalculation?.isFinal) {
    throw new CostingBatchValidationError(
      "Không thể xóa dòng FINAL khỏi batch. Bản tính giá FINAL vẫn được giữ trong lịch sử.",
    );
  }

  await prisma.pricingCostingBatchItem.delete({ where: { id: itemId } });
  return getCostingBatchDetail(batchId);
}
