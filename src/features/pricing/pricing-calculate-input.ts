import type { PricingCalculationType, PricingServiceType } from "@prisma/client";
import type { CalculatePricingInput, PricingItemInput } from "@/features/pricing/types";
import { parseMoneyInput, parseRequiredInt } from "@/features/pricing/parse-money";

export function parseCalculateBody(raw: Record<string, unknown>): CalculatePricingInput {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: PricingItemInput[] = itemsRaw.map((row) => {
    const item = row as Record<string, unknown>;
    const serviceOptionsRaw = Array.isArray(item.serviceOptions) ? item.serviceOptions : [];
    return {
      productId: typeof item.productId === "string" ? item.productId : undefined,
      variantId: typeof item.variantId === "string" ? item.variantId : undefined,
      productName: typeof item.productName === "string" ? item.productName : undefined,
      quantity: parseRequiredInt(item.quantity, 1),
      unit: typeof item.unit === "string" ? item.unit : "cái",
      manualUnitPrice: parseMoneyInput(item.manualUnitPrice) ?? undefined,
      manualOverrideReason: typeof item.manualOverrideReason === "string" ? item.manualOverrideReason : undefined,
      discountAmount: parseMoneyInput(item.discountAmount) ?? undefined,
      serviceOptions: serviceOptionsRaw.map((opt) => {
        const s = opt as Record<string, unknown>;
        return {
          serviceType: typeof s.serviceType === "string" ? (s.serviceType as PricingServiceType) : undefined,
          ruleId: typeof s.ruleId === "string" ? s.ruleId : undefined,
          name: typeof s.name === "string" ? s.name : undefined,
          calculationType: typeof s.calculationType === "string" ? (s.calculationType as PricingCalculationType) : undefined,
          quantity: parseMoneyInput(s.quantity) ?? undefined,
          unitPrice: parseMoneyInput(s.unitPrice) ?? undefined,
          setupFee: parseMoneyInput(s.setupFee) ?? undefined,
          manualAmount: parseMoneyInput(s.manualAmount) ?? undefined,
        };
      }),
    };
  });

  return {
    leadId: typeof raw.leadId === "string" ? raw.leadId : undefined,
    customerId: typeof raw.customerId === "string" ? raw.customerId : undefined,
    contactId: typeof raw.contactId === "string" ? raw.contactId : undefined,
    priceGroupId: typeof raw.priceGroupId === "string" ? raw.priceGroupId : undefined,
    items,
    discountAmount: parseMoneyInput(raw.discountAmount) ?? undefined,
    shippingFee: parseMoneyInput(raw.shippingFee) ?? undefined,
    vatRate: parseMoneyInput(raw.vatRate) ?? undefined,
    manualTotalAmount: parseMoneyInput(raw.manualTotalAmount) ?? undefined,
    manualOverrideReason: typeof raw.manualOverrideReason === "string" ? raw.manualOverrideReason : undefined,
    internalNote: typeof raw.internalNote === "string" ? raw.internalNote : undefined,
  };
}
