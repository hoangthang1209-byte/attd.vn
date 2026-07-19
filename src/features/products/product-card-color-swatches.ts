/**
 * Public product-card / PDP color swatches — extract and display helpers.
 * Appearance comes only from structured hex (AttributeValue.hexCode / Color.hex).
 * Never infer fill color from Vietnamese/English labels.
 */

import type { StockStatus } from "@prisma/client";
import {
  readProductEntryFromMetadata,
  type ProductEntryMode,
  type ProductStockMode,
} from "@/features/products/product-entry-modes";
import { variantCountsAsPubliclyInStock } from "@/features/products/product-foundation-validation";

export type ProductCardColorSwatch = {
  id: string;
  name: string;
  hex?: string | null;
  code?: string | null;
  isAvailable?: boolean;
};

export const PRODUCT_CARD_MAX_VISIBLE_COLOR_SWATCHES = 6;

/** Neutral fill when no structured hex is available. */
export const NEUTRAL_COLOR_SWATCH_HEX = "#9ca3af";

/** Prisma select fragment for variant color data on public product cards (no N+1). */
export const PRODUCT_CARD_COLOR_VARIANT_SELECT = {
  id: true,
  stockStatus: true,
  stockQty: true,
  variantStatus: true,
  colorName: true,
  colorCode: true,
  color: { select: { id: true, name: true, hex: true } },
  optionValues: {
    select: {
      optionValue: {
        select: {
          id: true,
          label: true,
          valueCode: true,
          attributeValue: { select: { name: true, code: true, hexCode: true } },
          option: { select: { name: true, slug: true } },
        },
      },
    },
  },
} as const;

type ColorOptionGroupRef = {
  name?: string | null;
  slug?: string | null;
};

type ColorOptionValueRef = {
  id: string;
  label?: string | null;
  valueCode?: string | null;
  attributeValue?: {
    name?: string | null;
    code?: string | null;
    hexCode?: string | null;
  } | null;
  option?: ColorOptionGroupRef | null;
};

export type ProductCardColorVariantInput = {
  id?: string;
  variantStatus?: string | null;
  stockStatus?: string | null;
  stockQty?: number | null;
  colorName?: string | null;
  colorCode?: string | null;
  color?: {
    id?: string | null;
    name?: string | null;
    hex?: string | null;
  } | null;
  optionValues?: Array<{
    optionValueId?: string;
    optionValue?: ColorOptionValueRef | null;
  } | null> | null;
};

export type ProductCardColorProductInput = {
  supportsOem?: boolean | null;
  metadata?: unknown;
  variants?: ProductCardColorVariantInput[] | null;
};

/**
 * Accent-stripped lowercase key for deduplicating color labels only.
 * Must not be used to invent hex/appearance.
 */
export function normalizeColorNameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns a safe CSS hex or null — never pass through arbitrary strings. */
export function sanitizeCssHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

/**
 * Resolve a renderable swatch fill from structured hex only.
 * Invalid/missing → neutral gray (never transparent / never name-inferred).
 */
export function resolveStructuredSwatchHex(hex?: string | null): string {
  return sanitizeCssHexColor(hex) ?? NEUTRAL_COLOR_SWATCH_HEX;
}

/**
 * Returns sanitized structured hex, or null when absent/invalid.
 * Does not inspect labels.
 */
export function resolveColorSwatchHex(input: {
  hex?: string | null;
  /** @deprecated Ignored — appearance must come from structured hex only. */
  name?: string;
}): string | null {
  return sanitizeCssHexColor(input.hex);
}

export function isColorOptionGroupRef(group: ColorOptionGroupRef | null | undefined): boolean {
  if (!group) return false;
  const slug = (group.slug ?? "").toLowerCase();
  const name = (group.name ?? "").toLowerCase();
  return (
    slug.includes("color") ||
    slug.includes("colour") ||
    slug.includes("mau") ||
    name.includes("màu") ||
    name.includes("mau sac") ||
    name.includes("color") ||
    name.includes("colour")
  );
}

function isArchivedOrHiddenVariant(variant: ProductCardColorVariantInput): boolean {
  const status = (variant.variantStatus ?? "ACTIVE").toUpperCase();
  return status === "ARCHIVED" || status === "INACTIVE" || status === "HIDDEN";
}

function isMadeToOrderOrOemProduct(product: ProductCardColorProductInput): boolean {
  if (product.supportsOem) return true;
  const entry = readProductEntryFromMetadata(product.metadata);
  const mode = entry.mode as ProductEntryMode | undefined;
  const stockMode = entry.stockMode as ProductStockMode | undefined;
  if (mode === "MADE_TO_ORDER" || mode === "OEM_SOURCING" || mode === "GIFT_MERCHANDISE") {
    return true;
  }
  if (stockMode === "MADE_TO_ORDER" || stockMode === "PREORDER") {
    return true;
  }
  return false;
}

function isSellableVariant(variant: ProductCardColorVariantInput): boolean {
  const status = (variant.stockStatus ?? "OUT_OF_STOCK") as StockStatus;
  if (variant.stockQty == null) {
    return status === "IN_STOCK" || status === "LOW_STOCK";
  }
  return variantCountsAsPubliclyInStock(variant.stockQty, status);
}

/**
 * Color swatches represent configured sellable colors for B2B / made-to-order.
 * Use every ACTIVE (non-archived) variant — do not require warehouse stock.
 * Stock status still feeds `isAvailable` for optional UI signals.
 */
function selectVariantsForColorSwatches(
  product: ProductCardColorProductInput,
): ProductCardColorVariantInput[] {
  return (product.variants ?? []).filter(
    (variant) => variant && !isArchivedOrHiddenVariant(variant),
  );
}

type RawColorCandidate = {
  id: string;
  name: string;
  hex?: string | null;
  code?: string | null;
  isAvailable: boolean;
};

function pushCandidate(
  bucket: Map<string, RawColorCandidate>,
  candidate: RawColorCandidate,
): void {
  const key = normalizeColorNameKey(candidate.name);
  if (!key) return;
  const existing = bucket.get(key);
  if (!existing) {
    bucket.set(key, {
      ...candidate,
      name: candidate.name.trim(),
      hex: sanitizeCssHexColor(candidate.hex),
    });
    return;
  }
  // Prefer explicit structured hex / richer code; keep availability if any variant is sellable.
  if (!existing.hex && candidate.hex) {
    existing.hex = sanitizeCssHexColor(candidate.hex);
  }
  if (!existing.code && candidate.code) {
    existing.code = candidate.code;
  }
  if (candidate.isAvailable) {
    existing.isAvailable = true;
  }
}

function extractStructuredColorCandidates(
  variant: ProductCardColorVariantInput,
  isAvailable: boolean,
  bucket: Map<string, RawColorCandidate>,
): boolean {
  let found = false;
  for (const link of variant.optionValues ?? []) {
    const value = link?.optionValue;
    if (!value?.id) continue;
    if (!isColorOptionGroupRef(value.option ?? undefined)) continue;
    const name = (value.label ?? value.attributeValue?.name ?? "").trim();
    if (!name) continue;
    found = true;
    pushCandidate(bucket, {
      id: value.id,
      name,
      hex: value.attributeValue?.hexCode ?? null,
      code: value.valueCode ?? value.attributeValue?.code ?? null,
      isAvailable,
    });
  }
  return found;
}

function extractLegacyColorCandidate(
  variant: ProductCardColorVariantInput,
  isAvailable: boolean,
  bucket: Map<string, RawColorCandidate>,
): void {
  const linkedName = variant.color?.name?.trim();
  const legacyName = variant.colorName?.trim();
  const name = linkedName || legacyName;
  if (!name) return;
  pushCandidate(bucket, {
    id: variant.color?.id?.trim() || `legacy:${normalizeColorNameKey(name)}`,
    name,
    hex: variant.color?.hex ?? null,
    code: variant.colorCode?.trim() || null,
    isAvailable,
  });
}

/**
 * Extract unique available colors for a public product card.
 * Prefer structured ProductOptionValue color links; fall back to legacy color fields.
 * Hex comes only from AttributeValue.hexCode or Color.hex — never from labels.
 */
export function extractProductCardColorSwatches(
  product: ProductCardColorProductInput,
): ProductCardColorSwatch[] {
  const bucket = new Map<string, RawColorCandidate>();

  for (const variant of selectVariantsForColorSwatches(product)) {
    const available = isSellableVariant(variant) || isMadeToOrderOrOemProduct(product);
    const hasStructured = extractStructuredColorCandidates(variant, available, bucket);
    if (!hasStructured) {
      extractLegacyColorCandidate(variant, available, bucket);
    }
  }

  return [...bucket.values()].map((item) => ({
    id: item.id,
    name: item.name,
    hex: item.hex ?? null,
    code: item.code ?? null,
    isAvailable: item.isAvailable,
  }));
}

export function mapProductCardAvailableColors(
  product: ProductCardColorProductInput,
): ProductCardColorSwatch[] {
  return extractProductCardColorSwatches(product);
}

export function splitVisibleColorSwatches(
  colors: ProductCardColorSwatch[],
  maxVisible = PRODUCT_CARD_MAX_VISIBLE_COLOR_SWATCHES,
): { visible: ProductCardColorSwatch[]; overflowCount: number } {
  if (colors.length <= maxVisible) {
    return { visible: colors, overflowCount: 0 };
  }
  return {
    visible: colors.slice(0, maxVisible),
    overflowCount: colors.length - maxVisible,
  };
}

/** White / very light structured hex needs a visible border on white UI. */
export function isLightColorSwatch(hex: string | null | undefined): boolean {
  const safe = sanitizeCssHexColor(hex);
  if (!safe) return false;
  const raw = safe.slice(1);
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance >= 0.82;
}
