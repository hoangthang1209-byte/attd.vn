import { prisma } from "@/lib/prisma";

// ─── Vietnamese → ASCII normalization ────────────────────────────────────────

const VI_MAP: Record<string, string> = {
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
  À: "A", Á: "A", Ả: "A", Ã: "A", Ạ: "A",
  Ă: "A", Ắ: "A", Ằ: "A", Ẳ: "A", Ẵ: "A", Ặ: "A",
  Â: "A", Ấ: "A", Ầ: "A", Ẩ: "A", Ẫ: "A", Ậ: "A",
  È: "E", É: "E", Ẻ: "E", Ẽ: "E", Ẹ: "E",
  Ê: "E", Ế: "E", Ề: "E", Ể: "E", Ễ: "E", Ệ: "E",
  Ì: "I", Í: "I", Ỉ: "I", Ĩ: "I", Ị: "I",
  Ò: "O", Ó: "O", Ỏ: "O", Õ: "O", Ọ: "O",
  Ô: "O", Ố: "O", Ồ: "O", Ổ: "O", Ỗ: "O", Ộ: "O",
  Ơ: "O", Ớ: "O", Ờ: "O", Ở: "O", Ỡ: "O", Ợ: "O",
  Ù: "U", Ú: "U", Ủ: "U", Ũ: "U", Ụ: "U",
  Ư: "U", Ứ: "U", Ừ: "U", Ử: "U", Ữ: "U", Ự: "U",
  Ỳ: "Y", Ý: "Y", Ỷ: "Y", Ỹ: "Y", Ỵ: "Y",
  Đ: "D",
};

export function normalizeSkuPart(input: string): string {
  if (!input) return "";
  return input
    .split("")
    .map((c) => VI_MAP[c] ?? c)
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

// ─── Color code table ─────────────────────────────────────────────────────────

const COLOR_CODES: Record<string, string> = {
  "den": "BLK", "black": "BLK",
  "trang": "WHT", "white": "WHT",
  "do": "RED", "red": "RED",
  "xanh navy": "NVY", "navy": "NVY",
  "xanh duong": "BLU", "blue": "BLU",
  "xanh la": "GRN", "green": "GRN",
  "xam": "GRY", "grey": "GRY", "gray": "GRY",
  "vang": "YEL", "yellow": "YEL",
  "cam": "ORG", "orange": "ORG",
  "be": "NT", "natural": "NT", "kem": "NT", "beige": "NT",
  "hong": "PNK", "pink": "PNK",
  "tim": "PRP", "purple": "PRP",
  "nau": "BRN", "brown": "BRN",
};

export function getColorSkuCode(colorName: string): string {
  if (!colorName) return "";
  const normalized = colorName
    .split("")
    .map((c) => VI_MAP[c] ?? c)
    .join("")
    .toLowerCase()
    .trim();
  return COLOR_CODES[normalized] ?? normalizeSkuPart(colorName).slice(0, 4);
}

// ─── Category SKU code ────────────────────────────────────────────────────────

export function getCategorySkuCode(categoryName: string, skuCode?: string | null): string {
  if (skuCode?.trim()) return skuCode.trim().toUpperCase();
  const CATEGORY_CODES: Record<string, string> = {
    "ao thun": "TS", "ao thun tron": "TS", "thun": "TS",
    "ao polo": "PO", "polo": "PO",
    "ao khoac": "JK", "khoac": "JK", "jacket": "JK",
    "hoodie": "HD", "sweater": "HD",
    "non": "CAP", "mu": "CAP", "hat": "CAP",
    "tote bag": "TOTE", "tote": "TOTE", "tui tote": "TOTE",
    "binh giu nhiet": "BGN", "binh": "BGN",
    "bandana": "BND", "khan": "BND",
    "gift set": "GIFT", "combo": "GIFT", "qua tang": "GIFT",
    "oem": "OEM",
  };
  const normalized = categoryName
    .split("")
    .map((c) => VI_MAP[c] ?? c)
    .join("")
    .toLowerCase()
    .trim();
  for (const [key, code] of Object.entries(CATEGORY_CODES)) {
    if (normalized.includes(key)) return code;
  }
  return normalizeSkuPart(categoryName).slice(0, 4);
}

// ─── Product code from name ───────────────────────────────────────────────────

export function generateProductCode(productName: string, material?: string | null): string {
  const MATERIAL_CODES: Record<string, string> = {
    "cotton": "CT", "100% cotton": "CT",
    "cvc": "CVC",
    "tc": "TC",
    "polyester": "PL", "poly": "PL",
    "pique": "PQ", "ca sau": "PQ",
    "inox": "INX", "stainless": "INX",
    "canvas": "CAN",
    "non woven": "NW",
    "fleece": "FLC",
  };

  let code = "";
  if (material) {
    const matNorm = material.split("").map((c) => VI_MAP[c] ?? c).join("").toLowerCase();
    for (const [key, val] of Object.entries(MATERIAL_CODES)) {
      if (matNorm.includes(key)) { code = val; break; }
    }
  }
  if (!code) {
    const words = productName
      .split("")
      .map((c) => VI_MAP[c] ?? c)
      .join("")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !["AO", "CO", "DE", "BO"].includes(w));
    code = words.map((w) => w.slice(0, 3)).join("").slice(0, 8);
  }
  return code || "PRD";
}

// ─── Variant code ─────────────────────────────────────────────────────────────

export function generateVariantCode(input: {
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
}): string {
  const parts: string[] = [];

  const color = input.colorCode?.trim()
    || (input.colorName ? getColorSkuCode(input.colorName) : "");
  if (color) parts.push(color);

  const size = normalizeSkuPart(input.sizeName ?? "").slice(0, 4);
  if (size) parts.push(size);

  const dim = normalizeSkuPart((input.dimensions ?? "").replace(/[xX×]/g, "X")).slice(0, 8);
  if (dim && !size) parts.push(dim);

  const cap = normalizeSkuPart(input.capacity ?? "").slice(0, 6);
  if (cap && !size && !dim) parts.push(cap);

  return parts.join("-");
}

// ─── Main SKU generator ───────────────────────────────────────────────────────

export function generateSku(input: {
  categorySkuCode: string;
  productCode: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
}): string {
  const parts = [
    "ATTD",
    input.categorySkuCode.toUpperCase().slice(0, 6),
    input.productCode.toUpperCase().slice(0, 8),
  ];

  const variantCode = generateVariantCode(input);
  if (variantCode) parts.push(variantCode);

  return parts.filter(Boolean).join("-");
}

// ─── Uniqueness enforcement ───────────────────────────────────────────────────

export async function ensureUniqueSku(baseSku: string): Promise<string> {
  const existing = await prisma.productVariant.findUnique({ where: { sku: baseSku } });
  if (!existing) return baseSku;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSku}-${i}`;
    const dup = await prisma.productVariant.findUnique({ where: { sku: candidate } });
    if (!dup) return candidate;
  }
  return `${baseSku}-${Date.now()}`;
}

export async function isSkuTaken(sku: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.productVariant.findUnique({ where: { sku } });
  if (!existing) return false;
  if (excludeId && existing.id === excludeId) return false;
  return true;
}
