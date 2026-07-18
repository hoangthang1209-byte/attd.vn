import { getColorSkuCode, normalizeSkuPart } from "@/features/products/product-sku-utils";

/** Attribute-value color codes preferred by admin UX (may differ slightly from SKU legacy PRP). */
const ATTRIBUTE_COLOR_CODES: Record<string, string> = {
  den: "BLK",
  black: "BLK",
  trang: "WHT",
  white: "WHT",
  do: "RED",
  red: "RED",
  "xanh la": "GRN",
  green: "GRN",
  "xanh duong": "BLU",
  blue: "BLU",
  "xanh navy": "NVY",
  navy: "NVY",
  vang: "YLW",
  yellow: "YLW",
  cam: "ORG",
  orange: "ORG",
  tim: "PUR",
  purple: "PUR",
  hong: "PNK",
  pink: "PNK",
  xam: "GRY",
  grey: "GRY",
  gray: "GRY",
  be: "BEI",
  beige: "BEI",
  bei: "BEI",
  nau: "BRN",
  brown: "BRN",
};

const COLOR_HEX_BY_CODE: Record<string, string> = {
  BLK: "#111827",
  WHT: "#FFFFFF",
  RED: "#DC2626",
  GRN: "#16A34A",
  BLU: "#2563EB",
  NVY: "#1E3A5F",
  YLW: "#FACC15",
  ORG: "#F97316",
  PUR: "#7C3AED",
  PRP: "#7C3AED",
  PNK: "#EC4899",
  GRY: "#6B7280",
  BEI: "#D6C4A8",
  BRN: "#92400E",
  NT: "#E7E5E4",
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const SIZE_LABEL_CODES: Record<string, string> = {
  xs: "XS",
  s: "S",
  small: "S",
  m: "M",
  medium: "M",
  l: "L",
  large: "L",
  xl: "XL",
  xxl: "XXL",
  "2xl": "XXL",
  "3xl": "3XL",
};

function normalizeColorKey(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Prefer English name for code generation; fall back to Vietnamese. */
export function resolveAttributeNamingSource(nameVi: string, nameEn?: string | null): string {
  const english = (nameEn ?? "").trim();
  if (english) return english;
  return nameVi.trim();
}

export function isColorAttribute(attribute: {
  code?: string | null;
  slug?: string | null;
  name?: string | null;
  displayType?: string | null;
}): boolean {
  const code = (attribute.code ?? "").trim().toUpperCase();
  const slug = (attribute.slug ?? "").trim().toLowerCase();
  const name = normalizeColorKey(attribute.name ?? "");
  const displayType = (attribute.displayType ?? "").toUpperCase();
  return (
    displayType === "COLOR_SWATCH" ||
    code === "COLOR" ||
    slug === "color" ||
    slug.includes("mau") ||
    name === "mau sac" ||
    name.includes("mau")
  );
}

export function suggestAttributeColorCode(colorName: string): string {
  const key = normalizeColorKey(colorName);
  if (!key) return "";
  const sortedKeys = Object.keys(ATTRIBUTE_COLOR_CODES).sort((a, b) => b.length - a.length);
  for (const candidate of sortedKeys) {
    if (key === candidate || key.includes(candidate)) {
      return ATTRIBUTE_COLOR_CODES[candidate]!;
    }
  }
  const fromSkuHelper = getColorSkuCode(colorName);
  if (fromSkuHelper === "PRP") return "PUR";
  if (fromSkuHelper === "NT") return "BEI";
  return fromSkuHelper || normalizeSkuPart(colorName).slice(0, 4);
}

export function suggestColorHex(codeOrName: string): string {
  const code = suggestAttributeColorCode(codeOrName) || codeOrName.trim().toUpperCase();
  return COLOR_HEX_BY_CODE[code] ?? "";
}

export function isValidHexColor(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return HEX_RE.test(trimmed);
}

/**
 * Suggest an uppercase ASCII code from English (preferred) or Vietnamese name.
 * Does not mutate existing codes — caller must pass `existingCodes` for collision suffixes.
 */
export function suggestAttributeValueCode(options: {
  nameVi: string;
  nameEn?: string | null;
  isColor?: boolean;
  isSize?: boolean;
  existingCodes?: string[];
}): string {
  const source = resolveAttributeNamingSource(options.nameVi, options.nameEn);
  if (!source) return "";

  let base = "";
  if (options.isColor) {
    base = suggestAttributeColorCode(source);
  } else if (options.isSize) {
    const sizeKey = source.trim().toLowerCase().replace(/\s+/g, "");
    base = SIZE_LABEL_CODES[sizeKey] ?? normalizeSkuPart(source).slice(0, 6);
  } else {
    const hasDigit = /\d/.test(source);
    const words = source.trim().split(/\s+/).filter(Boolean);
    if (!hasDigit && words.length > 1) {
      base = normalizeSkuPart(words[0]!).slice(0, 12);
    } else {
      base = normalizeSkuPart(source).slice(0, 12);
    }
  }

  if (!base) base = "VAL";
  return nextAvailableAttributeCode(base, options.existingCodes ?? []);
}

/** If base exists, append 2, 3, … (GRN2, GRN3). Never overwrites existing codes. */
export function nextAvailableAttributeCode(baseCode: string, existingCodes: string[]): string {
  const base = normalizeSkuPart(baseCode).slice(0, 14) || "VAL";
  const used = new Set(existingCodes.map((code) => code.trim().toUpperCase()).filter(Boolean));
  if (!used.has(base)) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export function suggestAttributeCode(nameVi: string, nameEn?: string | null, existingCodes: string[] = []): string {
  const source = resolveAttributeNamingSource(nameVi, nameEn);
  if (!source) return "";
  const key = normalizeColorKey(source);
  if (key.includes("mau") || key === "color") {
    return nextAvailableAttributeCode("COLOR", existingCodes);
  }
  if (key.includes("kich thuoc") || key === "size") {
    return nextAvailableAttributeCode("SIZE", existingCodes);
  }
  return nextAvailableAttributeCode(normalizeSkuPart(source).slice(0, 10) || "ATTR", existingCodes);
}

export const ATTRIBUTE_VALUE_DUPLICATE_MESSAGE = "Giá trị này đã tồn tại.";
