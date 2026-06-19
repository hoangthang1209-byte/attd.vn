import type { QuotePriceVatType } from "@prisma/client";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";

export function safeText(
  value: unknown,
  fallback = "",
): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

export function safeDash(value: unknown): string {
  const text = safeText(value).trim();
  return text || "-";
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    try {
      const parsed = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function safeDate(value: unknown): string {
  const raw = safeText(value).trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function safeMoney(value: unknown, currency = "VND"): string {
  const amount = safeNumber(value, NaN);
  if (!Number.isFinite(amount)) return "-";
  const cur = safeText(currency, "VND").trim() || "VND";
  if (cur === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)} đ`;
}

export function safeMoq(value: unknown): string {
  const num = safeNumber(value, NaN);
  if (!Number.isFinite(num) || num <= 0) return "-";
  return String(num);
}

export function safePriceType(value: unknown): string {
  if (value == null) return "-";
  try {
    return quotePriceVatTypeLabel(value as QuotePriceVatType);
  } catch {
    return safeDash(value);
  }
}

export function safeDim(value: number, min = 1): number {
  if (!Number.isFinite(value) || value <= 0) return min;
  return Math.max(min, value);
}

export function designCellLabel(item: {
  designImageUrl?: string | null;
}): string {
  return safeText(item.designImageUrl).trim() ? "Có" : "-";
}
