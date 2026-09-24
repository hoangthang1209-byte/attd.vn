import type { CalculatePricingResult } from "@/features/pricing/types";
import type { QuoteItemInput } from "@/features/quotes/types";
import type { QuickQuoteLineRow } from "@/features/quotes/quick-quote/quick-quote.types";

export function validateQuickQuoteLine(line: QuickQuoteLineRow): string | null {
  if (!line.productId.trim()) return "Chọn sản phẩm";
  const qty = parseInt(line.quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) return "Số lượng phải ≥ 1";
  if (line.manualUnitPrice.trim()) {
    const manual = Number(line.manualUnitPrice);
    if (!Number.isFinite(manual) || manual < 0) return "Đơn giá không hợp lệ";
  }
  return null;
}

export function buildPricingCalculatePayload(input: {
  leadId?: string;
  customerId?: string;
  contactId?: string;
  priceGroupId?: string;
  lines: QuickQuoteLineRow[];
  discountAmount: string;
  shippingFee: string;
  vatRate: string;
}) {
  return {
    leadId: input.leadId || undefined,
    customerId: input.customerId || undefined,
    contactId: input.contactId || undefined,
    priceGroupId: input.priceGroupId || undefined,
    discountAmount: input.discountAmount.trim() ? Number(input.discountAmount) : undefined,
    shippingFee: input.shippingFee.trim() ? Number(input.shippingFee) : undefined,
    vatRate: input.vatRate.trim() ? Number(input.vatRate) : undefined,
    items: input.lines
      .filter((line) => line.productId.trim())
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId || undefined,
        quantity: parseInt(line.quantity, 10) || 1,
        unit: "cái",
        manualUnitPrice: line.manualUnitPrice.trim() ? Number(line.manualUnitPrice) : undefined,
      })),
  };
}

export function pricingResultToQuoteItems(result: CalculatePricingResult): QuoteItemInput[] {
  return result.items.map((item, index) => ({
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
    manualUnitPrice: item.manualUnitPrice,
    manualOverrideReason: item.manualOverrideReason,
    pricingSnapshot: item.pricingSnapshot,
    sortOrder: index,
  }));
}

export function mergeLineNotes(
  items: QuoteItemInput[],
  lines: QuickQuoteLineRow[],
): QuoteItemInput[] {
  const keyed = new Map<string, QuickQuoteLineRow>();
  for (const line of lines) {
    if (!line.productId) continue;
    const key = `${line.productId}:${line.variantId || ""}`;
    keyed.set(key, line);
  }
  return items.map((item) => {
    const key = `${item.productId ?? ""}:${item.variantId ?? ""}`;
    const line = keyed.get(key);
    if (!line?.itemNote.trim()) return item;
    return { ...item, itemNote: line.itemNote.trim() };
  });
}
