import type { PricingCalculationType, PricingServiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServicePriceRuleRecord } from "@/features/pricing/types";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";

function mapRule(row: {
  id: string;
  serviceType: PricingServiceType;
  name: string;
  priceGroupId: string | null;
  minQuantity: number;
  maxQuantity: number | null;
  calculationType: PricingCalculationType;
  unitPrice: { toNumber(): number };
  setupFee: { toNumber(): number };
  currency: string;
  isActive: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  priceGroup?: { name: string } | null;
}): ServicePriceRuleRecord {
  return {
    id: row.id,
    serviceType: row.serviceType,
    name: row.name,
    priceGroupId: row.priceGroupId,
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    calculationType: row.calculationType,
    unitPrice: row.unitPrice.toNumber(),
    setupFee: row.setupFee.toNumber(),
    currency: row.currency,
    isActive: row.isActive,
    note: row.note,
    priceGroupName: row.priceGroup?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateQuantities(minQuantity: number, maxQuantity: number | null) {
  if (minQuantity < 1) throw new PricingValidationError("Số lượng từ phải >= 1.");
  if (maxQuantity != null && maxQuantity < minQuantity) {
    throw new PricingValidationError("Số lượng đến phải >= số lượng từ.");
  }
}

export async function listServicePriceRules(params?: {
  serviceType?: PricingServiceType;
  priceGroupId?: string;
  activeOnly?: boolean;
}) {
  const rows = await prisma.servicePriceRule.findMany({
    where: {
      serviceType: params?.serviceType,
      priceGroupId: params?.priceGroupId,
      isActive: params?.activeOnly ? true : undefined,
    },
    include: { priceGroup: { select: { name: true } } },
    orderBy: [{ serviceType: "asc" }, { name: "asc" }],
  });
  return { rules: rows.map(mapRule), total: rows.length };
}

export async function createServicePriceRule(input: {
  serviceType: PricingServiceType;
  name: string;
  priceGroupId?: string | null;
  minQuantity?: number;
  maxQuantity?: number | null;
  calculationType?: PricingCalculationType;
  unitPrice?: number;
  setupFee?: number;
  note?: string | null;
  isActive?: boolean;
}) {
  const name = input.name.trim();
  if (!name) throw new PricingValidationError("Tên phí là bắt buộc.");
  const minQuantity = input.minQuantity ?? 1;
  validateQuantities(minQuantity, input.maxQuantity ?? null);
  if ((input.unitPrice ?? 0) < 0) throw new PricingValidationError("Đơn giá phải >= 0.");
  if ((input.setupFee ?? 0) < 0) throw new PricingValidationError("Phí setup phải >= 0.");

  const row = await prisma.servicePriceRule.create({
    data: {
      serviceType: input.serviceType,
      name,
      priceGroupId: input.priceGroupId || null,
      minQuantity,
      maxQuantity: input.maxQuantity ?? null,
      calculationType: input.calculationType ?? "PER_ITEM",
      unitPrice: input.unitPrice ?? 0,
      setupFee: input.setupFee ?? 0,
      note: input.note?.trim() || null,
      isActive: input.isActive ?? true,
    },
    include: { priceGroup: { select: { name: true } } },
  });
  return mapRule(row);
}

export async function updateServicePriceRule(
  id: string,
  input: {
    serviceType?: PricingServiceType;
    name?: string;
    priceGroupId?: string | null;
    minQuantity?: number;
    maxQuantity?: number | null;
    calculationType?: PricingCalculationType;
    unitPrice?: number;
    setupFee?: number;
    note?: string | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.servicePriceRule.findUnique({ where: { id } });
  if (!existing) throw new PricingValidationError("Không tìm thấy quy tắc phí.");

  const minQuantity = input.minQuantity ?? existing.minQuantity;
  const maxQuantity = input.maxQuantity !== undefined ? input.maxQuantity : existing.maxQuantity;
  validateQuantities(minQuantity, maxQuantity);

  const row = await prisma.servicePriceRule.update({
    where: { id },
    data: {
      serviceType: input.serviceType,
      name: input.name?.trim(),
      priceGroupId: input.priceGroupId !== undefined ? (input.priceGroupId || null) : undefined,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity !== undefined ? input.maxQuantity : undefined,
      calculationType: input.calculationType,
      unitPrice: input.unitPrice,
      setupFee: input.setupFee,
      note: input.note !== undefined ? (input.note?.trim() || null) : undefined,
      isActive: input.isActive,
    },
    include: { priceGroup: { select: { name: true } } },
  });
  return mapRule(row);
}

export async function getServiceRulesForPricing(priceGroupId: string | null, ruleIds: string[]) {
  const rules = await prisma.servicePriceRule.findMany({
    where: {
      isActive: true,
      OR: [
        { id: { in: ruleIds } },
        ...(priceGroupId ? [{ priceGroupId }, { priceGroupId: null }] : [{ priceGroupId: null }]),
      ],
    },
  });
  return rules;
}
