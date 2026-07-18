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
  BLK: "#000000",
  WHT: "#FFFFFF",
  RED: "#DC2626",
  GRN: "#16A34A",
  BLU: "#2563EB",
  NVY: "#1E3A8A",
  YLW: "#EAB308",
  ORG: "#EA580C",
  PUR: "#7C3AED",
  PRP: "#7C3AED",
  PNK: "#DB2777",
  GRY: "#6B7280",
  BEI: "#D6C3A3",
  BRN: "#92400E",
  NT: "#E7E5E4",
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

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

export const ATTRIBUTE_VALUE_DUPLICATE_MESSAGE = "Giá trị này đã tồn tại.";
