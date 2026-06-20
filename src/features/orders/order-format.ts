import { formatPricingCurrency } from "@/features/pricing/format";
import { formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/format";

export function formatOrderCurrency(
  amount: number | null | undefined,
  currency = "VND",
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

export function formatOrderDate(iso: string | null | undefined): string {
  return formatQuoteDate(iso);
}

export function formatOrderDateTime(iso: string | null | undefined): string {
  return formatQuoteDateTime(iso);
}

export function toDateTimeLocalValue(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
