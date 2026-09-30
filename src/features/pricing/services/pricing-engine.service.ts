import type { PricingCalculationType, ProductPriceTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultPriceGroup, getPriceGroupById } from "@/features/pricing/services/price-group.service";
import { getServiceRulesForPricing } from "@/features/pricing/services/service-rule.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { lineDiscountIsValid, pricingMarginRate } from "@/features/pricing/pricing-p1-guards";
import type {
  CalculatePricingInput,
  CalculatePricingResult,
  PricingItemBreakdown,
  PricingItemInput,
  PricingServiceOptionInput,
} from "@/features/pricing/types";

const NO_TIER_WARNING = "Chưa có bảng giá phù hợp";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function isTierEffective(tier: ProductPriceTier, at: Date): boolean {
  if (tier.effectiveFrom && at < tier.effectiveFrom) return false;
  if (tier.effectiveTo && at > tier.effectiveTo) return false;
  return true;
}

function tierMatchesQuantity(tier: ProductPriceTier, quantity: number): boolean {
  if (quantity < tier.minQuantity) return false;
  if (tier.maxQuantity != null && quantity > tier.maxQuantity) return false;
  return true;
}

function pickBestTier(tiers: ProductPriceTier[], quantity: number, variantId?: string | null): ProductPriceTier | null {
  const now = new Date();
  const matching = tiers.filter(
    (t) => t.isActive && tierMatchesQuantity(t, quantity) && isTierEffective(t, now)
  );

  if (variantId) {
    const variantTiers = matching.filter((t) => t.variantId === variantId);
    if (variantTiers.length > 1) {
      throw new PricingValidationError(
        "Có nhiều dòng giá biến thể cùng hiệu lực cho số lượng này. Vui lòng kiểm tra lại Bảng giá chuẩn trước khi báo giá.",
      );
    }
    if (variantTiers.length === 1) return variantTiers[0];
  }

  const productTiers = matching.filter((t) => !t.variantId);
  if (productTiers.length > 1) {
    throw new PricingValidationError(
      "Có nhiều dòng giá sản phẩm cùng hiệu lực cho số lượng này. Vui lòng kiểm tra lại Bảng giá chuẩn trước khi báo giá.",
    );
  }
  return productTiers[0] ?? null;
}

function variantLabel(variant: {
  sku: string;
  colorName: string | null;
  sizeName: string | null;
} | null): string | null {
  if (!variant) return null;
  return [variant.sku, variant.colorName, variant.sizeName].filter(Boolean).join(" · ") || variant.sku;
}

function computeServiceAmounts(
  item: PricingItemInput,
  serviceOptions: PricingServiceOptionInput[],
  rulesById: Map<string, {
    calculationType: PricingCalculationType;
    unitPrice: number;
    setupFee: number;
    name: string;
    minQuantity: number;
    maxQuantity: number | null;
  }>
): { perItemAdd: number; lineServiceFee: number; lineSetupFee: number; serviceDetails: unknown[] } {
  let perItemAdd = 0;
  let lineServiceFee = 0;
  let lineSetupFee = 0;
  const serviceDetails: unknown[] = [];

  for (const opt of serviceOptions) {
    const rule = opt.ruleId ? rulesById.get(opt.ruleId) : undefined;
    if (opt.ruleId && !rule) {
      throw new PricingValidationError("Phí dịch vụ không thuộc nhóm giá đang chọn hoặc không còn hoạt động.");
    }
    if (rule && (item.quantity < rule.minQuantity || (rule.maxQuantity != null && item.quantity > rule.maxQuantity))) {
      throw new PricingValidationError(
        `Phí dịch vụ "${rule.name}" không áp dụng cho số lượng ${item.quantity}.`,
      );
    }
    const calcType = opt.calculationType ?? rule?.calculationType ?? "PER_ITEM";
    const unitPrice = opt.unitPrice ?? rule?.unitPrice ?? 0;
    const setupFee = opt.setupFee ?? rule?.setupFee ?? 0;
    const qty = opt.quantity ?? item.quantity;

    let amount = 0;
    switch (calcType) {
      case "PER_ITEM":
        perItemAdd += unitPrice;
        amount = unitPrice * item.quantity;
        lineSetupFee += setupFee;
        break;
      case "PER_ORDER":
        lineServiceFee += unitPrice;
        amount = unitPrice;
        lineSetupFee += setupFee;
        break;
      case "PER_POSITION":
        lineServiceFee += unitPrice * qty;
        amount = unitPrice * qty;
        lineSetupFee += setupFee;
        break;
      case "MANUAL":
        lineServiceFee += opt.manualAmount ?? 0;
        amount = opt.manualAmount ?? 0;
        break;
      default:
        break;
    }

    serviceDetails.push({
      ruleId: opt.ruleId ?? null,
      name: opt.name ?? rule?.name ?? null,
      calculationType: calcType,
      unitPrice,
      setupFee,
      quantity: qty,
      amount: roundMoney(amount),
    });
  }

  return {
    perItemAdd: roundMoney(perItemAdd),
    lineServiceFee: roundMoney(lineServiceFee),
    lineSetupFee: roundMoney(lineSetupFee),
    serviceDetails,
  };
}

export async function calculatePricing(input: CalculatePricingInput): Promise<CalculatePricingResult> {
  const warnings: string[] = [];
  const nonNegativeFields: Array<[string, number | undefined]> = [
    ["Chiết khấu", input.discountAmount],
    ["Phí vận chuyển", input.shippingFee],
    ["Tổng tiền chỉnh tay", input.manualTotalAmount],
  ];
  for (const [label, value] of nonNegativeFields) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      throw new PricingValidationError(`${label} phải là số không âm.`);
    }
  }
  if (input.vatRate != null && (!Number.isFinite(input.vatRate) || input.vatRate < 0 || input.vatRate > 100)) {
    throw new PricingValidationError("VAT phải nằm trong khoảng 0–100%.");
  }
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity < 1) {
      throw new PricingValidationError("Số lượng sản phẩm phải lớn hơn 0.");
    }
    if (item.manualUnitPrice != null && (!Number.isFinite(item.manualUnitPrice) || item.manualUnitPrice < 0)) {
      throw new PricingValidationError("Đơn giá chỉnh tay phải là số không âm.");
    }
    if (item.discountAmount != null && (!Number.isFinite(item.discountAmount) || item.discountAmount < 0)) {
      throw new PricingValidationError("Chiết khấu dòng sản phẩm phải là số không âm.");
    }
  }
  let priceGroupRow = input.priceGroupId
    ? await prisma.priceGroup.findUnique({ where: { id: input.priceGroupId } })
    : await getDefaultPriceGroup();

  if (!priceGroupRow) {
    priceGroupRow = await getDefaultPriceGroup();
  }

  const priceGroup = priceGroupRow
    ? await getPriceGroupById(priceGroupRow.id)
    : null;

  const productIds = input.items.map((i) => i.productId).filter(Boolean) as string[];
  const variantIds = input.items.map((i) => i.variantId).filter(Boolean) as string[];
  const ruleIds = input.items.flatMap((i) =>
    (i.serviceOptions ?? []).map((s) => s.ruleId).filter(Boolean) as string[]
  );

  const [tiers, products, variants, serviceRules] = await Promise.all([
    priceGroupRow
      ? prisma.productPriceTier.findMany({
          where: { priceGroupId: priceGroupRow.id, productId: { in: productIds }, isActive: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    variantIds.length
      ? prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, sku: true, colorName: true, sizeName: true },
        })
      : Promise.resolve([]),
    getServiceRulesForPricing(priceGroupRow?.id ?? null, ruleIds),
  ]);

  const productsById = new Map(products.map((p) => [p.id, p]));
  const variantsById = new Map(variants.map((v) => [v.id, v]));
  const tiersByProduct = new Map<string, ProductPriceTier[]>();
  for (const tier of tiers) {
    const list = tiersByProduct.get(tier.productId) ?? [];
    list.push(tier);
    tiersByProduct.set(tier.productId, list);
  }

  const rulesById = new Map(
    serviceRules.map((r) => [
      r.id,
      {
        calculationType: r.calculationType,
        unitPrice: r.unitPrice.toNumber(),
        setupFee: r.setupFee.toNumber(),
        name: r.name,
        minQuantity: r.minQuantity,
        maxQuantity: r.maxQuantity,
      },
    ])
  );

  const itemBreakdowns: PricingItemBreakdown[] = [];
  let serviceTotal = 0;
  let setupTotal = 0;

  for (const item of input.items) {
    const product = item.productId ? productsById.get(item.productId) : undefined;
    const variant = item.variantId ? variantsById.get(item.variantId) : undefined;
    const productName = item.productName?.trim() || product?.name || "Sản phẩm tùy chỉnh";
    const variantName = variantLabel(variant ?? null);

    let baseUnitPrice = 0;
    let costEstimate: number | null = null;
    let matchedTier: ProductPriceTier | null = null;

    if (item.productId && priceGroupRow) {
      const productTiers = tiersByProduct.get(item.productId) ?? [];
      matchedTier = pickBestTier(productTiers, item.quantity, item.variantId);
      if (matchedTier) {
        baseUnitPrice = matchedTier.unitPrice.toNumber();
        costEstimate = matchedTier.costPrice?.toNumber() ?? null;
      } else {
        warnings.push(`${productName}: ${NO_TIER_WARNING}`);
      }
    } else if (item.productId) {
      warnings.push(`${productName}: ${NO_TIER_WARNING}`);
    }

    const { perItemAdd, lineServiceFee, lineSetupFee, serviceDetails } = computeServiceAmounts(
      item,
      item.serviceOptions ?? [],
      rulesById
    );

    serviceTotal += lineServiceFee;
    setupTotal += lineSetupFee;

    let unitPrice = roundMoney(baseUnitPrice + perItemAdd);
    let manualOverride = false;
    let manualUnitPrice: number | null = null;

    if (item.manualUnitPrice != null && Number.isFinite(item.manualUnitPrice)) {
      manualOverride = true;
      manualUnitPrice = item.manualUnitPrice;
      unitPrice = item.manualUnitPrice;
    }

    const lineSubtotal = roundMoney(unitPrice * item.quantity + lineSetupFee + lineServiceFee);
    const itemDiscount = item.discountAmount ?? 0;
    if (!lineDiscountIsValid(lineSubtotal, itemDiscount)) {
      throw new PricingValidationError(
        `Chiết khấu dòng "${productName}" không được vượt quá thành tiền trước chiết khấu.`,
      );
    }
    const lineTotal = roundMoney(lineSubtotal - itemDiscount);

    let marginAmount: number | null = null;
    let marginRate: number | null = null;
    if (costEstimate != null && lineTotal > 0) {
      const totalCost = roundMoney(costEstimate * item.quantity);
      marginAmount = roundMoney(lineTotal - totalCost);
      marginRate = pricingMarginRate(lineTotal, totalCost);
    }

    itemBreakdowns.push({
      productId: item.productId ?? null,
      variantId: item.variantId ?? null,
      productName,
      variantName,
      quantity: item.quantity,
      unit: item.unit ?? "cái",
      baseUnitPrice,
      serviceFee: lineServiceFee,
      setupFee: lineSetupFee,
      unitPrice,
      discountAmount: itemDiscount,
      lineSubtotal,
      lineTotal,
      costEstimate: costEstimate != null ? roundMoney(costEstimate * item.quantity) : null,
      marginAmount,
      marginRate,
      manualOverride,
      manualUnitPrice,
      manualOverrideReason: item.manualOverrideReason ?? null,
      pricingSnapshot: {
        matchedTierId: matchedTier?.id ?? null,
        perItemServiceAdd: perItemAdd,
        serviceDetails,
        calculatedAt: new Date().toISOString(),
      },
    });
  }

  const subtotal = roundMoney(itemBreakdowns.reduce((sum, i) => sum + i.lineTotal, 0));
  const discountAmount = input.discountAmount ?? 0;
  const shippingFee = input.shippingFee ?? 0;
  const vatRate = input.vatRate ?? 0;
  const taxableBase = roundMoney(subtotal - discountAmount + shippingFee);
  if (taxableBase < 0) {
    throw new PricingValidationError("Tổng sau chiết khấu và vận chuyển không được âm.");
  }
  const vatAmount = roundMoney((taxableBase * vatRate) / 100);
  const calculatedTotalAmount = roundMoney(taxableBase + vatAmount);

  let manualOverride = false;
  let manualTotalAmount: number | null = null;
  let totalAmount = calculatedTotalAmount;

  if (input.manualTotalAmount != null && Number.isFinite(input.manualTotalAmount)) {
    manualOverride = true;
    manualTotalAmount = input.manualTotalAmount;
    totalAmount = input.manualTotalAmount;
  }

  return {
    priceGroup,
    items: itemBreakdowns,
    subtotal,
    serviceTotal: roundMoney(serviceTotal),
    setupTotal: roundMoney(setupTotal),
    discountAmount,
    shippingFee,
    vatRate,
    vatAmount,
    totalAmount,
    calculatedTotalAmount,
    manualOverride,
    manualTotalAmount,
    manualOverrideReason: input.manualOverrideReason ?? null,
    warnings: [...new Set(warnings)],
  };
}
