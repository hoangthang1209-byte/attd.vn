import type { OrderItemSupplySource } from "@prisma/client";

export const QUICK_ORDER_COLOR_NAME_MAX_LENGTH = 100;
export const QUICK_ORDER_COLOR_CODE_MAX_LENGTH = 50;

const HTML_TAG_PATTERN = /<[^>]*>/g;

export function stripHtmlFromText(value: string): string {
  return value.replace(HTML_TAG_PATTERN, "").trim();
}

export function sanitizeQuickOrderColorName(value: string): string {
  return stripHtmlFromText(value).slice(0, QUICK_ORDER_COLOR_NAME_MAX_LENGTH);
}

export function sanitizeQuickOrderColorCode(value: string): string {
  return stripHtmlFromText(value).slice(0, QUICK_ORDER_COLOR_CODE_MAX_LENGTH);
}

export function buildQuickOrderColorDisplaySnapshot(input: {
  colorName: string;
  colorCode?: string | null;
}): string {
  const name = sanitizeQuickOrderColorName(input.colorName);
  const code = sanitizeQuickOrderColorCode(input.colorCode ?? "");
  if (!name && !code) return "";
  if (!code) return name;
  if (!name) return code;
  return `${name} · ${code}`;
}

export function isValidQuickOrderColorName(value: string): boolean {
  const sanitized = sanitizeQuickOrderColorName(value);
  return sanitized.length > 0;
}

export function requiresCatalogColor(supplySource: OrderItemSupplySource | null | undefined): boolean {
  return supplySource === "ATTD_STOCK";
}

export function allowsCustomOrderColor(supplySource: OrderItemSupplySource | null | undefined): boolean {
  return Boolean(supplySource && supplySource !== "ATTD_STOCK");
}
