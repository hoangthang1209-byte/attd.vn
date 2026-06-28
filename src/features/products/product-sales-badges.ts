import { formatMoqNumber, isPublicMoq } from "@/lib/formatMoq";

export type ProductCuratedBadgeKey = "BEST_SELLER" | "NEW";

export const PRODUCT_CURATED_BADGE_KEYS: ProductCuratedBadgeKey[] = ["BEST_SELLER", "NEW"];

export const PRODUCT_CURATED_BADGE_LABELS: Record<ProductCuratedBadgeKey, string> = {
  BEST_SELLER: "Bán chạy",
  NEW: "Mới",
};

export const METADATA_CURATED_SALES_BADGES_KEY = "curatedSalesBadges";

export type ProductSalesBadgeIcon = "moq" | "print" | "factory" | "flame" | "sparkle";

export type ProductSalesBadge = {
  key: string;
  label: string;
  kind: "automatic" | "curated";
  priority: number;
  icon?: ProductSalesBadgeIcon;
};

/** Normalized badge payload safe for public product cards. */
export type PublicProductSalesBadge = Pick<ProductSalesBadge, "key" | "label" | "kind" | "icon">;

const BADGE_PRIORITY = {
  MOQ: 1,
  BEST_SELLER: 2,
  NEW: 3,
  PRINTING: 4,
  OEM: 5,
} as const;

const MAX_VISIBLE_BADGES = 2;

export type ProductSalesBadgeInput = {
  defaultMoq?: number | null;
  supportsPrinting?: boolean;
  supportsOem?: boolean;
  curatedSalesBadges?: ProductCuratedBadgeKey[];
  metadata?: unknown;
};

function isCuratedBadgeKey(value: unknown): value is ProductCuratedBadgeKey {
  return typeof value === "string" && PRODUCT_CURATED_BADGE_KEYS.includes(value as ProductCuratedBadgeKey);
}

export function parseCuratedSalesBadgeKeysFromMetadata(metadata: unknown): ProductCuratedBadgeKey[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>)[METADATA_CURATED_SALES_BADGES_KEY];
  if (!Array.isArray(raw)) return [];
  const keys: ProductCuratedBadgeKey[] = [];
  for (const item of raw) {
    if (!isCuratedBadgeKey(item)) continue;
    if (keys.includes(item)) continue;
    keys.push(item);
    if (keys.length >= MAX_VISIBLE_BADGES) break;
  }
  return keys;
}

export function validateCuratedSalesBadgeKeys(
  value: unknown,
): { keys: ProductCuratedBadgeKey[] } | { error: string } {
  if (value === undefined || value === null) {
    return { keys: [] };
  }
  if (!Array.isArray(value)) {
    return { error: "Nhãn bán hàng không hợp lệ." };
  }
  const keys: ProductCuratedBadgeKey[] = [];
  for (const item of value) {
    if (!isCuratedBadgeKey(item)) {
      return { error: "Chỉ được chọn nhãn hỗ trợ: Bán chạy, Mới." };
    }
    if (keys.includes(item)) {
      return { error: "Không được chọn trùng nhãn bán hàng." };
    }
    keys.push(item);
  }
  if (keys.length > MAX_VISIBLE_BADGES) {
    return { error: "Tối đa 2 nhãn bán hàng được chọn." };
  }
  return { keys };
}

export function mergeCuratedSalesBadgesIntoMetadata(
  existingMetadata: unknown,
  keys: ProductCuratedBadgeKey[],
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};
  if (keys.length === 0) {
    delete base[METADATA_CURATED_SALES_BADGES_KEY];
  } else {
    base[METADATA_CURATED_SALES_BADGES_KEY] = keys;
  }
  return base;
}

function resolveCuratedKeys(input: ProductSalesBadgeInput): ProductCuratedBadgeKey[] {
  if (input.curatedSalesBadges !== undefined) {
    return input.curatedSalesBadges;
  }
  return parseCuratedSalesBadgeKeysFromMetadata(input.metadata);
}

function collectCandidateBadges(input: ProductSalesBadgeInput): ProductSalesBadge[] {
  const curatedKeys = resolveCuratedKeys(input);
  const candidates: ProductSalesBadge[] = [];

  if (isPublicMoq(input.defaultMoq)) {
    candidates.push({
      key: "MOQ",
      label: `MOQ từ ${formatMoqNumber(input.defaultMoq)}`,
      kind: "automatic",
      priority: BADGE_PRIORITY.MOQ,
      icon: "moq",
    });
  }

  for (const key of curatedKeys) {
    if (key === "BEST_SELLER") {
      candidates.push({
        key,
        label: PRODUCT_CURATED_BADGE_LABELS.BEST_SELLER,
        kind: "curated",
        priority: BADGE_PRIORITY.BEST_SELLER,
        icon: "flame",
      });
    } else if (key === "NEW") {
      candidates.push({
        key,
        label: PRODUCT_CURATED_BADGE_LABELS.NEW,
        kind: "curated",
        priority: BADGE_PRIORITY.NEW,
        icon: "sparkle",
      });
    }
  }

  if (input.supportsPrinting === true) {
    candidates.push({
      key: "PRINTING",
      label: "In logo riêng",
      kind: "automatic",
      priority: BADGE_PRIORITY.PRINTING,
      icon: "print",
    });
  }

  if (input.supportsOem === true) {
    candidates.push({
      key: "OEM",
      label: "OEM / Private Label",
      kind: "automatic",
      priority: BADGE_PRIORITY.OEM,
      icon: "factory",
    });
  }

  return candidates;
}

export function resolveAutomaticSalesBadgePreviews(
  input: Pick<ProductSalesBadgeInput, "defaultMoq" | "supportsPrinting" | "supportsOem">,
): ProductSalesBadge[] {
  return collectCandidateBadges({
    ...input,
    curatedSalesBadges: [],
  }).filter((badge) => badge.kind === "automatic");
}

export function resolveProductSalesBadges(input: ProductSalesBadgeInput): ProductSalesBadge[] {
  const seenLabels = new Set<string>();
  return collectCandidateBadges(input)
    .sort((a, b) => a.priority - b.priority)
    .filter((badge) => {
      if (seenLabels.has(badge.label)) return false;
      seenLabels.add(badge.label);
      return true;
    })
    .slice(0, MAX_VISIBLE_BADGES);
}

export function mapPublicProductCardSalesBadges(input: ProductSalesBadgeInput): PublicProductSalesBadge[] {
  return resolveProductSalesBadges(input).map(({ key, label, kind, icon }) => ({
    key,
    label,
    kind,
    icon,
  }));
}
