import { NextRequest, NextResponse } from "next/server";
import {
  calculateCosting,
  calculateCostingQuantityBreaks,
  saveCostingCalculation,
} from "@/features/pricing/services/costing-calculator.service";
import type {
  CostingCalculatorInput,
  CostingComponentInput,
  CostingComponentType,
  CostingQuantityBreakResult,
} from "@/features/pricing/costing-types";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const COMPONENT_TYPES: CostingComponentType[] = [
  "MATERIAL",
  "RIB",
  "CUTTING",
  "SEWING",
  "PRINTING",
  "EMBROIDERY",
  "WASH",
  "PACKAGING",
  "LOGISTICS",
  "OTHER",
];

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asComponentType(value: unknown): CostingComponentType | undefined {
  return typeof value === "string" && COMPONENT_TYPES.includes(value as CostingComponentType)
    ? (value as CostingComponentType)
    : undefined;
}

function parseComponents(value: unknown): CostingComponentInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      key: asString(row.key),
      label: asString(row.label) ?? "Chi phí khác",
      type: asComponentType(row.type) ?? "OTHER",
      unitCost: asNumber(row.unitCost),
      totalCost: asNumber(row.totalCost),
      quantityFactor: asNumber(row.quantityFactor),
      note: asString(row.note),
    }))
    .filter((row) => row.label || row.unitCost != null || row.totalCost != null);
}

function parseCostingBody(raw: Record<string, unknown>): CostingCalculatorInput {
  return {
    productId: asString(raw.productId),
    variantId: asString(raw.variantId),
    customProductName: asString(raw.customProductName),
    quantity: Math.max(1, Math.round(asNumber(raw.quantity) ?? 1)),
    unit: asString(raw.unit) ?? "cái",
    materialName: asString(raw.materialName),
    gsm: asNumber(raw.gsm),
    fabricPrice: asNumber(raw.fabricPrice),
    fabricConsumption: asNumber(raw.fabricConsumption),
    fabricCostPerUnit: asNumber(raw.fabricCostPerUnit),
    ribCostPerUnit: asNumber(raw.ribCostPerUnit),
    components: parseComponents(raw.components),
    overheadRate: asNumber(raw.overheadRate),
    targetMarginRate: asNumber(raw.targetMarginRate),
    vatRate: asNumber(raw.vatRate),
    leadId: asString(raw.leadId),
    customerId: asString(raw.customerId),
    contactId: asString(raw.contactId),
    priceGroupId: asString(raw.priceGroupId),
    internalNote: asString(raw.internalNote),
    createQuote: asBoolean(raw.createQuote),
    quantityBreaks: parseQuantityBreaks(raw.quantityBreaks),
  };
}

function parseQuantityBreaks(value: unknown): CostingQuantityBreakResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      quantity: asNumber(row.quantity),
      totalCostPerUnit: asNumber(row.totalCostPerUnit),
      suggestedSellingPricePerUnit: asNumber(row.suggestedSellingPricePerUnit),
      revenueBeforeVat: asNumber(row.revenueBeforeVat),
      grossProfit: asNumber(row.grossProfit),
      actualMarginRate: asNumber(row.actualMarginRate),
      finalQuotePrice: asNumber(row.finalQuotePrice),
    }))
    .filter((row): row is CostingQuantityBreakResult => row.quantity != null)
    .map((row) => ({
      quantity: Math.max(1, Math.round(row.quantity)),
      totalCostPerUnit: row.totalCostPerUnit ?? 0,
      suggestedSellingPricePerUnit: row.suggestedSellingPricePerUnit ?? 0,
      revenueBeforeVat: row.revenueBeforeVat ?? 0,
      grossProfit: row.grossProfit ?? 0,
      actualMarginRate: row.actualMarginRate ?? 0,
      finalQuotePrice: row.finalQuotePrice ?? 0,
    }));
}

function parseQuantityTiers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asNumber(item))
      .filter((item): item is number => item != null && Number.isFinite(item))
      .map((item) => Math.max(1, Math.round(item)));
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => asNumber(item.trim()))
      .filter((item): item is number => item != null && Number.isFinite(item))
      .map((item) => Math.max(1, Math.round(item)));
  }

  return [];
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const raw = body as Record<string, unknown>;
    const input = parseCostingBody(raw);
    const mode = asString(raw.mode) ?? "calculate";

    if (mode === "save" || mode === "createQuote") {
      const saved = await saveCostingCalculation({ ...input, createQuote: mode === "createQuote" || input.createQuote });
      return NextResponse.json({ saved }, { status: 201 });
    }

    if (mode === "quantityBreaks") {
      const tiers = parseQuantityTiers(raw.quantityTiers);
      if (tiers.length === 0) {
        return NextResponse.json({ message: "Vui lòng nhập danh sách số lượng hợp lệ." }, { status: 400 });
      }
      const breaks = await calculateCostingQuantityBreaks(input, tiers);
      return NextResponse.json({ breaks });
    }

    const result = await calculateCosting(input);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[POST /api/pricing/costing]", err);
    return NextResponse.json({ message: "Không thể tính giá costing" }, { status: 500 });
  }
}
