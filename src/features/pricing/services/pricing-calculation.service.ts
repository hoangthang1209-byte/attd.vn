import type { PricingCalculationStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePricingCalculationCode } from "@/features/pricing/pricing-code";
import { calculatePricing } from "@/features/pricing/services/pricing-engine.service";
import type {
  CalculatePricingInput,
  PricingCalculationListRecord,
} from "@/features/pricing/types";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";

function mapListRow(row: {
  id: string;
  code: string;
  leadId: string | null;
  customerId: string | null;
  priceGroupId: string | null;
  status: PricingCalculationStatus;
  totalAmount: { toNumber(): number };
  manualOverride: boolean;
  manualTotalAmount: { toNumber(): number } | null;
  createdAt: Date;
  lead?: { fullName: string; company: string | null; companyName: string | null } | null;
  customer?: { name: string } | null;
  priceGroup?: { name: string } | null;
}): PricingCalculationListRecord {
  const leadLabel = row.lead
    ? [row.lead.fullName, row.lead.companyName ?? row.lead.company].filter(Boolean).join(" · ")
    : null;
  return {
    id: row.id,
    code: row.code,
    leadId: row.leadId,
    customerId: row.customerId,
    priceGroupId: row.priceGroupId,
    status: row.status,
    totalAmount: row.totalAmount.toNumber(),
    manualOverride: row.manualOverride,
    manualTotalAmount: row.manualTotalAmount?.toNumber() ?? null,
    leadLabel,
    customerLabel: row.customer?.name ?? null,
    priceGroupName: row.priceGroup?.name ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function savePricingCalculation(
  input: CalculatePricingInput & { status?: PricingCalculationStatus }
) {
  if (!input.items?.length) {
    throw new PricingValidationError("Cần ít nhất một dòng sản phẩm.");
  }

  const result = await calculatePricing(input);
  const code = await generatePricingCalculationCode();

  const calculation = await prisma.$transaction(async (tx) => {
    const calc = await tx.pricingCalculation.create({
      data: {
        code,
        leadId: input.leadId || null,
        customerId: input.customerId || null,
        contactId: input.contactId || null,
        priceGroupId: result.priceGroup?.id ?? null,
        status: input.status ?? "CALCULATED",
        subtotal: result.subtotal,
        serviceTotal: result.serviceTotal,
        setupTotal: result.setupTotal,
        discountAmount: result.discountAmount,
        shippingFee: result.shippingFee,
        vatRate: result.vatRate,
        vatAmount: result.vatAmount,
        totalAmount: result.totalAmount,
        manualOverride: result.manualOverride,
        manualTotalAmount: result.manualTotalAmount,
        manualOverrideReason: result.manualOverrideReason,
        internalNote: input.internalNote?.trim() || null,
        inputSnapshot: input as Prisma.InputJsonValue,
        resultSnapshot: result as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.pricingCalculationItem.createMany({
      data: result.items.map((item) => ({
        pricingCalculationId: calc.id,
        productId: item.productId,
        variantId: item.variantId,
        productNameSnapshot: item.productName,
        variantNameSnapshot: item.variantName,
        quantity: item.quantity,
        unit: item.unit,
        baseUnitPrice: item.baseUnitPrice,
        serviceFee: item.serviceFee,
        setupFee: item.setupFee,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        lineSubtotal: item.lineSubtotal,
        lineTotal: item.lineTotal,
        costEstimate: item.costEstimate,
        marginAmount: item.marginAmount,
        marginRate: item.marginRate,
        pricingSnapshot: item.pricingSnapshot as Prisma.InputJsonValue,
        manualOverride: item.manualOverride,
        manualUnitPrice: item.manualUnitPrice,
        manualOverrideReason: item.manualOverrideReason,
      })),
    });

    return calc;
  });

  return getPricingCalculationDetail(calculation.id);
}

export async function listPricingCalculations(params?: {
  search?: string;
  status?: PricingCalculationStatus;
  limit?: number;
}) {
  const limit = params?.limit ?? 50;
  const search = params?.search?.trim();

  const rows = await prisma.pricingCalculation.findMany({
    where: {
      status: params?.status,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { lead: { fullName: { contains: search, mode: "insensitive" } } },
              { lead: { companyName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      lead: { select: { fullName: true, company: true, companyName: true } },
      customer: { select: { name: true } },
      priceGroup: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    calculations: rows.map(mapListRow),
    total: rows.length,
  };
}

export async function getPricingCalculationDetail(id: string) {
  const row = await prisma.pricingCalculation.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, fullName: true, company: true, companyName: true, code: true } },
      customer: { select: { id: true, name: true, code: true } },
      contact: { select: { id: true, fullName: true } },
      priceGroup: { select: { id: true, name: true, code: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: { select: { id: true, name: true, productCode: true } },
          variant: { select: { id: true, sku: true } },
        },
      },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    status: row.status,
    lead: row.lead,
    customer: row.customer,
    contact: row.contact,
    priceGroup: row.priceGroup,
    subtotal: row.subtotal.toNumber(),
    serviceTotal: row.serviceTotal.toNumber(),
    setupTotal: row.setupTotal.toNumber(),
    discountAmount: row.discountAmount.toNumber(),
    shippingFee: row.shippingFee.toNumber(),
    vatRate: row.vatRate.toNumber(),
    vatAmount: row.vatAmount.toNumber(),
    totalAmount: row.totalAmount.toNumber(),
    manualOverride: row.manualOverride,
    manualTotalAmount: row.manualTotalAmount?.toNumber() ?? null,
    manualOverrideReason: row.manualOverrideReason,
    internalNote: row.internalNote,
    inputSnapshot: row.inputSnapshot,
    resultSnapshot: row.resultSnapshot,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      quantity: item.quantity,
      unit: item.unit,
      baseUnitPrice: item.baseUnitPrice.toNumber(),
      serviceFee: item.serviceFee.toNumber(),
      setupFee: item.setupFee.toNumber(),
      unitPrice: item.unitPrice.toNumber(),
      discountAmount: item.discountAmount.toNumber(),
      lineSubtotal: item.lineSubtotal.toNumber(),
      lineTotal: item.lineTotal.toNumber(),
      costEstimate: item.costEstimate?.toNumber() ?? null,
      marginAmount: item.marginAmount?.toNumber() ?? null,
      marginRate: item.marginRate?.toNumber() ?? null,
      pricingSnapshot: item.pricingSnapshot,
      manualOverride: item.manualOverride,
      manualUnitPrice: item.manualUnitPrice?.toNumber() ?? null,
      manualOverrideReason: item.manualOverrideReason,
      product: item.product,
      variant: item.variant,
    })),
    warnings: extractWarnings(row.resultSnapshot),
  };
}

function extractWarnings(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const warnings = (snapshot as { warnings?: unknown }).warnings;
  return Array.isArray(warnings) ? warnings.filter((w): w is string => typeof w === "string") : [];
}
