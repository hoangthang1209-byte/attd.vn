import type { QuotePriceVatType } from "@prisma/client";
import { formatPricingCurrency } from "@/features/pricing/format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";

export function formatQuoteMoney(
  amount: number | null | undefined,
  currency = "VND"
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return formatPricingCurrency(amount);
}

export function formatQuotePriceTypeLabel(priceVatType: QuotePriceVatType): string {
  return quotePriceVatTypeLabel(priceVatType);
}

export function formatQuoteMoq(moq: number | null | undefined): string {
  if (moq == null || moq <= 0) return "—";
  return String(moq);
}

export function getQuoteDesignImageUrl(item: {
  designImageUrl?: string | null;
  designMediaAsset?: { url: string } | null;
}): string | null {
  return item.designImageUrl?.trim() || item.designMediaAsset?.url || null;
}
