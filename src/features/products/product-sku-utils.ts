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

export const CATEGORY_SKU_CODE_MISSING_ERROR =
  "Danh mục chưa có mã danh mục. Vui lòng cập nhật mã danh mục trước khi tạo sản phẩm.";

export const CATEGORY_CODE_DUPLICATE_ERROR =
  "Mã danh mục đã tồn tại. Vui lòng chọn mã khác.";

export const CATEGORY_PRODUCT_CODE_LIMIT_ERROR =
  "Danh mục đã đạt giới hạn 9999 mã sản phẩm.";

export class ProductSkuError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductSkuError";
  }
}

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

export function normalizeCategorySkuCode(raw: string): string {
  return normalizeSkuPart(raw);
}

/** Normalize category/product code parts — uppercase ASCII, no accents. */
export function normalizeCode(input: string): string {
  return normalizeCategorySkuCode(input);
}

// ─── Category code from name ──────────────────────────────────────────────────

const CATEGORY_NAME_CODES: Record<string, string> = {
  "ao thun tron": "TS",
  "ao thun": "TS",
  thun: "TS",
  "ao polo tron": "POLO",
  "ao polo": "POLO",
  polo: "POLO",
  "tote bag": "TOTE",
  "tui tote": "TOTE",
  tote: "TOTE",
  "binh giu nhiet": "BGN",
  "binh giu": "BGN",
  "non dong phuc": "NON",
  non: "NON",
  bandana: "BANDANA",
  khan: "BANDANA",
  "gift set doanh nghiep": "GIFT",
  "gift set": "GIFT",
  "qua tang doanh nghiep": "GIFT",
  "qua tang": "GIFT",
  gift: "GIFT",
  combo: "GIFT",
  "oem private label": "OEM",
  oem: "OEM",
};

export function generateCategoryCodeFromName(name: string): string {
  if (!name.trim()) return "";

  const normalized = name
    .split("")
    .map((c) => VI_MAP[c] ?? c)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s/]/g, " ");

  const sortedKeys = Object.keys(CATEGORY_NAME_CODES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      return CATEGORY_NAME_CODES[key];
    }
  }

  const stopWords = new Set(["ao", "co", "de", "bo", "va", "the", "set", "la", "gi"]);
  const words = normalized.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));

  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 8);
  }

  if (words.length === 1) {
    return normalizeSkuPart(words[0]).slice(0, 8);
  }

  return normalizeSkuPart(name).slice(0, 8) || "CAT";
}

export async function isCategoryCodeTaken(
  code: string,
  excludeCategoryId?: string
): Promise<boolean> {
  const normalized = normalizeCode(code);
  if (!normalized) return false;

  const existing = await prisma.category.findFirst({
    where: {
      skuCode: { equals: normalized, mode: "insensitive" },
      ...(excludeCategoryId ? { NOT: { id: excludeCategoryId } } : {}),
    },
  });
  return !!existing;
}

export async function ensureUniqueCategoryCode(
  baseCode: string,
  excludeCategoryId?: string
): Promise<string> {
  const base = normalizeCode(baseCode);
  if (!base) return "";

  if (!(await isCategoryCodeTaken(base, excludeCategoryId))) {
    return base;
  }

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!(await isCategoryCodeTaken(candidate, excludeCategoryId))) {
      return candidate;
    }
  }

  throw new ProductSkuError(CATEGORY_CODE_DUPLICATE_ERROR);
}

// ─── Color code table ─────────────────────────────────────────────────────────

const COLOR_CODES: Record<string, string> = {
  den: "BLK", black: "BLK",
  trang: "WHT", white: "WHT",
  do: "RED", red: "RED",
  "xanh navy": "NVY", navy: "NVY",
  "xanh duong": "BLU", blue: "BLU",
  "xanh la": "GRN", green: "GRN",
  xam: "GRY", grey: "GRY", gray: "GRY",
  vang: "YEL", yellow: "YEL",
  cam: "ORG", orange: "ORG",
  be: "NT", natural: "NT", kem: "NT", beige: "NT",
  hong: "PNK", pink: "PNK",
  tim: "PRP", purple: "PRP",
  nau: "BRN", brown: "BRN",
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

/** @deprecated Legacy fallback — do not use for new product ID generation */
export function getCategorySkuCode(categoryName: string, skuCode?: string | null): string {
  if (skuCode?.trim()) return normalizeCategorySkuCode(skuCode);
  const CATEGORY_CODES: Record<string, string> = {
    "ao thun": "TS", "ao thun tron": "TS", thun: "TS",
    "ao polo": "POLO", polo: "POLO",
    "ao khoac": "JK", khoac: "JK", jacket: "JK",
    hoodie: "HD", sweater: "HD",
    non: "CAP", mu: "CAP", hat: "CAP",
    "tote bag": "TOTE", tote: "TOTE", "tui tote": "TOTE",
    "binh giu nhiet": "BGN", binh: "BGN",
    bandana: "BND", khan: "BND",
    "gift set": "GIFT", combo: "GIFT", "qua tang": "GIFT",
    oem: "OEM",
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
  return normalizeSkuPart(categoryName).slice(0, 6);
}

export function requireCategorySkuCode(skuCode?: string | null): string {
  const normalized = skuCode?.trim() ? normalizeCategorySkuCode(skuCode) : "";
  if (!normalized) {
    throw new ProductSkuError(CATEGORY_SKU_CODE_MISSING_ERROR);
  }
  return normalized;
}

export function parseProductCodeSuffix(prefix: string, productCode: string): number | null {
  const upper = productCode.toUpperCase();
  if (!upper.startsWith(prefix)) return null;
  const rest = upper.slice(prefix.length);
  if (!/^\d{4}$/.test(rest)) return null;
  return parseInt(rest, 10);
}

/** @alias parseProductCodeSuffix */
export function extractProductSequence(productCode: string, categoryCode: string): number | null {
  return parseProductCodeSuffix(categoryCode, productCode);
}

export function validateProductCodeForCategory(prefix: string, productCode: string): string {
  const upper = productCode.trim().toUpperCase();
  const pattern = new RegExp(`^${prefix}\\d{4}$`);
  if (!pattern.test(upper)) {
    throw new ProductSkuError(
      `Mã sản phẩm không hợp lệ. Phải theo định dạng ${prefix}0001.`
    );
  }
  return upper;
}

export async function getMaxProductCodeSuffix(
  categoryId: string,
  prefix: string
): Promise<number> {
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      productCode: { startsWith: prefix },
    },
    select: { productCode: true },
  });

  let maxSuffix = 0;
  for (const product of products) {
    if (!product.productCode) continue;
    const suffix = parseProductCodeSuffix(prefix, product.productCode);
    if (suffix !== null && suffix > maxSuffix) maxSuffix = suffix;
  }
  return maxSuffix;
}

export type CategoryCodeCounter = {
  categoryId: string;
  prefix: string;
  nextSuffix: number;
};

export async function initCategoryCodeCounter(categoryId: string): Promise<CategoryCodeCounter> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { skuCode: true },
  });
  const prefix = requireCategorySkuCode(category?.skuCode);
  const maxSuffix = await getMaxProductCodeSuffix(categoryId, prefix);
  return { categoryId, prefix, nextSuffix: maxSuffix + 1 };
}

export function allocateProductCodeFromCounter(counter: CategoryCodeCounter): string {
  if (counter.nextSuffix > 9999) {
    throw new ProductSkuError(CATEGORY_PRODUCT_CODE_LIMIT_ERROR);
  }
  const code = `${counter.prefix}${String(counter.nextSuffix).padStart(4, "0")}`;
  counter.nextSuffix += 1;
  return code;
}

export async function generateNextProductCode(
  categoryId: string,
  options?: { explicitCode?: string; counter?: CategoryCodeCounter }
): Promise<string> {
  if (options?.explicitCode?.trim()) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { skuCode: true },
    });
    const prefix = requireCategorySkuCode(category?.skuCode);
    return validateProductCodeForCategory(prefix, options.explicitCode);
  }

  if (options?.counter) {
    return allocateProductCodeFromCounter(options.counter);
  }

  const counter = await initCategoryCodeCounter(categoryId);
  return allocateProductCodeFromCounter(counter);
}

export async function ensureUniqueProductCode(
  categoryId: string,
  explicitCode?: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await generateNextProductCode(
      categoryId,
      attempt === 0 && explicitCode ? { explicitCode } : undefined
    );

    const existing = await prisma.product.findUnique({ where: { productCode: code } });
    if (!existing) return code;

    if (explicitCode) {
      throw new ProductSkuError("Mã sản phẩm đã tồn tại.");
    }
  }

  throw new ProductSkuError("Không thể tạo mã sản phẩm duy nhất. Vui lòng thử lại.");
}

export function buildProductGroupKey(
  categoryId: string,
  productName: string,
  productCode?: string | null
): string {
  return `${categoryId}::${productName.trim().toLowerCase()}::${(productCode ?? "").trim().toUpperCase()}`;
}

/** @deprecated Legacy name-based code — kept for reading old data only */
export function generateProductCode(productName: string, material?: string | null): string {
  const MATERIAL_CODES: Record<string, string> = {
    cotton: "CT", "100% cotton": "CT",
    cvc: "CVC",
    tc: "TC",
    polyester: "PL", poly: "PL",
    pique: "PQ", "ca sau": "PQ",
    inox: "INX", stainless: "INX",
    canvas: "CAN",
    "non woven": "NW",
    fleece: "FLC",
  };

  let code = "";
  if (material) {
    const matNorm = material.split("").map((c) => VI_MAP[c] ?? c).join("").toLowerCase();
    for (const [key, val] of Object.entries(MATERIAL_CODES)) {
      if (matNorm.includes(key)) {
        code = val;
        break;
      }
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

  const color =
    input.colorCode?.trim() ||
    (input.colorName ? getColorSkuCode(input.colorName) : "");
  if (color) parts.push(normalizeSkuPart(color).slice(0, 6));

  const size = normalizeSkuPart(input.sizeName ?? "").slice(0, 6);
  if (size) parts.push(size);

  const dim = normalizeSkuPart((input.dimensions ?? "").replace(/[xX×]/g, "X")).slice(0, 10);
  if (dim && !size) parts.push(dim);

  const cap = normalizeSkuPart(input.capacity ?? "").slice(0, 8);
  if (cap && !size && !dim) parts.push(cap);

  return parts.join("-");
}

// ─── Variant SKU = productCode + option suffixes ─────────────────────────────

export function generateSku(input: {
  productCode: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
}): string {
  const productCode = input.productCode.trim().toUpperCase();
  const variantCode = generateVariantCode(input);
  return variantCode ? `${productCode}-${variantCode}` : productCode;
}

export function buildVariantSkuExplanation(input: {
  productCode: string;
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
}): string {
  const variantSku = generateSku(input);
  const parts: string[] = [`ID sản phẩm: ${input.productCode.toUpperCase()}`];
  const suffix = generateVariantCode(input);
  if (suffix) {
    parts.push(`SKU lựa chọn = ID + ${suffix}`);
  } else {
    parts.push("Không có tùy chọn biến thể — SKU lựa chọn trùng ID sản phẩm");
  }
  parts.push(`Kết quả: ${variantSku}`);
  return parts.join(" · ");
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

export async function isProductCodeTaken(
  productCode: string,
  excludeProductId?: string
): Promise<boolean> {
  const existing = await prisma.product.findFirst({ where: { productCode } });
  if (!existing) return false;
  if (excludeProductId && existing.id === excludeProductId) return false;
  return true;
}
