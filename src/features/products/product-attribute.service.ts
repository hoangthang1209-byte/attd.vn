import type {
  ProductAttributeDisplayType,
  ProductAttributeType,
  ProductAttributeStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOptionGroupSlug, generateOptionValueCode } from "@/features/products/product-option-code.utils";
import { normalizeSkuPart } from "@/features/products/product-sku-utils";
import { normalizeOptionName } from "@/features/products/product-variant-matrix.utils";

export class ProductAttributeValidationError extends Error {
  fieldErrors: Record<string, string>;
  status: number;

  constructor(
    message: string,
    fieldErrors: Record<string, string> = {},
    status = 400,
  ) {
    super(message);
    this.name = "ProductAttributeValidationError";
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

export const ATTRIBUTE_DISPLAY_TYPE_LABELS: Record<ProductAttributeDisplayType, string> = {
  TEXT: "text",
  COLOR_SWATCH: "color swatch",
  SIZE: "size",
  SELECT: "select",
  IMAGE_SWATCH: "image swatch",
};

const VALID_DISPLAY_TYPES = new Set<ProductAttributeDisplayType>([
  "TEXT",
  "COLOR_SWATCH",
  "SIZE",
  "SELECT",
  "IMAGE_SWATCH",
]);

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeSlug(raw: string): string {
  return generateOptionGroupSlug(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "attribute";
}

function normalizeValueSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "value";
}

async function ensureUniqueAttributeSlug(base: string, excludeId?: string): Promise<string> {
  const normalized = normalizeSlug(base);
  for (let i = 1; i <= 99; i++) {
    const candidate = i === 1 ? normalized : `${normalized}-${i}`;
    const existing = await prisma.productAttribute.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${normalized}-${Date.now().toString(36)}`;
}

async function ensureUniqueAttributeCode(base: string, excludeId?: string): Promise<string> {
  const normalized = normalizeSkuPart(base).slice(0, 16) || "ATTR";
  for (let i = 1; i <= 99; i++) {
    const candidate = i === 1 ? normalized : `${normalized}${i}`;
    const existing = await prisma.productAttribute.findUnique({ where: { code: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${normalized}${Date.now().toString(36).toUpperCase()}`;
}

async function ensureUniqueValueSlug(attributeId: string, base: string, excludeId?: string): Promise<string> {
  const normalized = normalizeValueSlug(base);
  for (let i = 1; i <= 99; i++) {
    const candidate = i === 1 ? normalized : `${normalized}-${i}`;
    const existing = await prisma.productAttributeValue.findUnique({
      where: { attributeId_slug: { attributeId, slug: candidate } },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${normalized}-${Date.now().toString(36)}`;
}

async function ensureUniqueValueCode(
  attribute: { id: string; name: string; slug: string },
  name: string,
  requested?: string,
  excludeId?: string,
): Promise<string> {
  const existingValues = await prisma.productAttributeValue.findMany({
    where: { attributeId: attribute.id, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { code: true },
  });
  const existingCodes = existingValues.map((value) => value.code);
  const base = requested?.trim()
    ? normalizeSkuPart(requested).slice(0, 16)
    : generateOptionValueCode(attribute, name, existingCodes);

  for (let i = 1; i <= 99; i++) {
    const candidate = i === 1 ? base : `${base}${i}`;
    const existing = await prisma.productAttributeValue.findUnique({
      where: { attributeId_code: { attributeId: attribute.id, code: candidate } },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}${Date.now().toString(36).toUpperCase()}`;
}

async function assertUniqueAttributeName(name: string, excludeId?: string) {
  const attributes = await prisma.productAttribute.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { name: true },
  });
  if (attributes.some((attribute) => normalizeOptionName(attribute.name) === normalizeOptionName(name))) {
    throw new ProductAttributeValidationError(
      "Tên thuộc tính bị trùng.",
      { name: "Tên thuộc tính đã tồn tại." },
      409,
    );
  }
}

async function assertUniqueValueName(attributeId: string, name: string, excludeId?: string) {
  const values = await prisma.productAttributeValue.findMany({
    where: { attributeId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { name: true },
  });
  if (values.some((value) => normalizeOptionName(value.name) === normalizeOptionName(name))) {
    throw new ProductAttributeValidationError(
      "Tên giá trị thuộc tính bị trùng.",
      { name: "Tên giá trị đã tồn tại trong thuộc tính này." },
      409,
    );
  }
}

function parseSortOrder(value: unknown, field = "sortOrder"): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new ProductAttributeValidationError("Thứ tự hiển thị không hợp lệ.", {
      [field]: "Thứ tự hiển thị phải là số nguyên.",
    });
  }
  return n;
}

export async function listSharedAttributes(options?: {
  activeOnly?: boolean;
  variantOnly?: boolean;
  includeInactiveValues?: boolean;
}) {
  const attributes = await prisma.productAttribute.findMany({
    where: {
      ...(options?.activeOnly ? { status: "ACTIVE" as const } : {}),
      ...(options?.variantOnly ? { isVariantAttribute: true } : {}),
    },
    include: {
      values: {
        where: options?.includeInactiveValues ? undefined : { status: "ACTIVE" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      _count: { select: { productOptions: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const valueUsage = await prisma.productOptionValue.groupBy({
    by: ["attributeValueId"],
    where: { attributeValueId: { not: null } },
    _count: { _all: true },
  });
  const usageByValueId = new Map(
    valueUsage
      .filter((row) => row.attributeValueId)
      .map((row) => [row.attributeValueId!, row._count._all]),
  );

  return attributes.map((attribute) => ({
    ...attribute,
    usageCount: attribute._count.productOptions,
    values: attribute.values.map((value) => ({
      ...value,
      usageCount: usageByValueId.get(value.id) ?? 0,
    })),
  }));
}

export async function createSharedAttribute(raw: Record<string, unknown>) {
  const name = String(raw.name ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Tên thuộc tính là bắt buộc.";
  const displayType = String(raw.displayType ?? "TEXT").toUpperCase() as ProductAttributeDisplayType;
  if (!VALID_DISPLAY_TYPES.has(displayType)) {
    fieldErrors.displayType = "Kiểu hiển thị không hợp lệ.";
  }
  if (Object.keys(fieldErrors).length) {
    throw new ProductAttributeValidationError("Dữ liệu thuộc tính chưa hợp lệ.", fieldErrors);
  }

  await assertUniqueAttributeName(name);
  const code = await ensureUniqueAttributeCode(String(raw.code ?? name));
  const slug = await ensureUniqueAttributeSlug(String(raw.slug ?? name));

  return prisma.productAttribute.create({
    data: {
      name,
      code,
      slug,
      displayType,
      isVariantAttribute: raw.isVariantAttribute !== undefined ? Boolean(raw.isVariantAttribute) : true,
      isSpecificationAttribute: Boolean(raw.isSpecificationAttribute),
      status: raw.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      sortOrder: parseSortOrder(raw.sortOrder),
      note: raw.note ? String(raw.note).trim() : null,
    },
  });
}

export async function updateSharedAttribute(id: string, raw: Record<string, unknown>) {
  const existing = await prisma.productAttribute.findUnique({ where: { id } });
  if (!existing) {
    throw new ProductAttributeValidationError("Không tìm thấy thuộc tính.", {}, 404);
  }

  const data: Prisma.ProductAttributeUpdateInput = {};
  if (raw.name !== undefined) {
    const name = String(raw.name).trim();
    if (!name) throw new ProductAttributeValidationError("Dữ liệu thuộc tính chưa hợp lệ.", { name: "Tên thuộc tính là bắt buộc." });
    await assertUniqueAttributeName(name, id);
    data.name = name;
    if (raw.slug === undefined) data.slug = await ensureUniqueAttributeSlug(name, id);
    if (raw.code === undefined) data.code = await ensureUniqueAttributeCode(name, id);
  }
  if (raw.code !== undefined) data.code = await ensureUniqueAttributeCode(String(raw.code), id);
  if (raw.slug !== undefined) data.slug = await ensureUniqueAttributeSlug(String(raw.slug), id);
  if (raw.displayType !== undefined) {
    const displayType = String(raw.displayType).toUpperCase() as ProductAttributeDisplayType;
    if (!VALID_DISPLAY_TYPES.has(displayType)) {
      throw new ProductAttributeValidationError("Dữ liệu thuộc tính chưa hợp lệ.", { displayType: "Kiểu hiển thị không hợp lệ." });
    }
    data.displayType = displayType;
  }
  if (raw.isVariantAttribute !== undefined) data.isVariantAttribute = Boolean(raw.isVariantAttribute);
  if (raw.isSpecificationAttribute !== undefined) data.isSpecificationAttribute = Boolean(raw.isSpecificationAttribute);
  if (raw.status !== undefined) data.status = raw.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  if (raw.sortOrder !== undefined) data.sortOrder = parseSortOrder(raw.sortOrder);
  if (raw.note !== undefined) data.note = raw.note ? String(raw.note).trim() : null;

  return prisma.productAttribute.update({ where: { id }, data });
}

export async function createSharedAttributeValue(attributeId: string, raw: Record<string, unknown>) {
  const attribute = await prisma.productAttribute.findUnique({ where: { id: attributeId } });
  if (!attribute) {
    throw new ProductAttributeValidationError("Không tìm thấy thuộc tính cha.", { attributeId: "Thuộc tính cha không tồn tại." }, 404);
  }

  const name = String(raw.name ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Tên hiển thị là bắt buộc.";
  const hexCode = raw.hexCode ? String(raw.hexCode).trim() : null;
  if (hexCode && !HEX_RE.test(hexCode)) fieldErrors.hexCode = "Mã màu HEX không hợp lệ.";
  if (Object.keys(fieldErrors).length) {
    throw new ProductAttributeValidationError("Dữ liệu giá trị thuộc tính chưa hợp lệ.", fieldErrors);
  }

  await assertUniqueValueName(attributeId, name);
  const code = await ensureUniqueValueCode(attribute, name, raw.code ? String(raw.code) : undefined);
  const slug = await ensureUniqueValueSlug(attributeId, String(raw.slug ?? name));

  return prisma.productAttributeValue.create({
    data: {
      attributeId,
      name,
      code,
      slug,
      hexCode,
      imageUrl: raw.imageUrl ? String(raw.imageUrl).trim() : null,
      status: raw.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      sortOrder: parseSortOrder(raw.sortOrder),
    },
  });
}

export async function updateSharedAttributeValue(id: string, raw: Record<string, unknown>) {
  const existing = await prisma.productAttributeValue.findUnique({
    where: { id },
    include: { attribute: true },
  });
  if (!existing) {
    throw new ProductAttributeValidationError("Không tìm thấy giá trị thuộc tính.", {}, 404);
  }

  const data: Prisma.ProductAttributeValueUpdateInput = {};
  if (raw.name !== undefined) {
    const name = String(raw.name).trim();
    if (!name) throw new ProductAttributeValidationError("Dữ liệu giá trị thuộc tính chưa hợp lệ.", { name: "Tên hiển thị là bắt buộc." });
    await assertUniqueValueName(existing.attributeId, name, id);
    data.name = name;
    if (raw.slug === undefined) data.slug = await ensureUniqueValueSlug(existing.attributeId, name, id);
    if (raw.code === undefined) data.code = await ensureUniqueValueCode(existing.attribute, name, undefined, id);
  }
  if (raw.code !== undefined) {
    data.code = await ensureUniqueValueCode(existing.attribute, existing.name, String(raw.code), id);
  }
  if (raw.slug !== undefined) data.slug = await ensureUniqueValueSlug(existing.attributeId, String(raw.slug), id);
  if (raw.hexCode !== undefined) {
    const hexCode = raw.hexCode ? String(raw.hexCode).trim() : null;
    if (hexCode && !HEX_RE.test(hexCode)) {
      throw new ProductAttributeValidationError("Dữ liệu giá trị thuộc tính chưa hợp lệ.", { hexCode: "Mã màu HEX không hợp lệ." });
    }
    data.hexCode = hexCode;
  }
  if (raw.imageUrl !== undefined) data.imageUrl = raw.imageUrl ? String(raw.imageUrl).trim() : null;
  if (raw.status !== undefined) data.status = raw.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  if (raw.sortOrder !== undefined) data.sortOrder = parseSortOrder(raw.sortOrder);

  return prisma.productAttributeValue.update({ where: { id }, data });
}

export async function getAttributeDependencyCounts(attributeId: string) {
  const [productOptions, productValues, variantLinks] = await Promise.all([
    prisma.productOption.count({ where: { attributeId } }),
    prisma.productOptionValue.count({ where: { attributeValue: { attributeId } } }),
    prisma.productVariantOptionValue.count({
      where: { optionValue: { attributeValue: { attributeId } } },
    }),
  ]);
  return { productOptions, productValues, variantLinks, total: productOptions + productValues + variantLinks };
}

export async function getAttributeValueDependencyCounts(valueId: string) {
  const [productValues, variantLinks] = await Promise.all([
    prisma.productOptionValue.count({ where: { attributeValueId: valueId } }),
    prisma.productVariantOptionValue.count({ where: { optionValue: { attributeValueId: valueId } } }),
  ]);
  return { productValues, variantLinks, total: productValues + variantLinks };
}

export async function deleteSharedAttribute(id: string) {
  const deps = await getAttributeDependencyCounts(id);
  if (deps.total > 0) {
    throw new ProductAttributeValidationError(
      `Không thể xóa thuộc tính vì đang được sử dụng (${deps.productOptions} nhóm sản phẩm, ${deps.productValues} giá trị sản phẩm, ${deps.variantLinks} liên kết biến thể).`,
      { delete: "Thuộc tính đang được sử dụng. Hãy ngừng sử dụng thay vì xóa." },
      409,
    );
  }
  return prisma.productAttribute.delete({ where: { id } });
}

export async function deleteSharedAttributeValue(id: string) {
  const deps = await getAttributeValueDependencyCounts(id);
  if (deps.total > 0) {
    throw new ProductAttributeValidationError(
      `Không thể xóa giá trị vì đang được sử dụng (${deps.productValues} giá trị sản phẩm, ${deps.variantLinks} liên kết biến thể).`,
      { delete: "Giá trị đang được sử dụng. Hãy ngừng sử dụng thay vì xóa." },
      409,
    );
  }
  return prisma.productAttributeValue.delete({ where: { id } });
}

export async function seedSharedAttributes(): Promise<{ createdAttributes: number; createdValues: number; skippedValues: number }> {
  const seed = [
    {
      name: "Màu sắc",
      code: "COLOR",
      slug: "color",
      displayType: "COLOR_SWATCH" as const,
      sortOrder: 1,
      values: [
        ["Đen", "BLK", "#000000"],
        ["Trắng", "WHT", "#FFFFFF"],
        ["Navy", "NVY", "#1E3A5F"],
      ],
    },
    {
      name: "Kích thước",
      code: "SIZE",
      slug: "size",
      displayType: "SIZE" as const,
      sortOrder: 2,
      values: [
        ["S", "S", null],
        ["M", "M", null],
        ["L", "L", null],
        ["XL", "XL", null],
      ],
    },
    {
      name: "Form dáng",
      code: "FIT",
      slug: "fit",
      displayType: "SELECT" as const,
      sortOrder: 3,
      values: [
        ["Regular fit", "REGULAR", null],
        ["Oversize", "OVERSIZE", null],
      ],
    },
  ];

  let createdAttributes = 0;
  let createdValues = 0;
  let skippedValues = 0;

  for (const item of seed) {
    let attribute = await prisma.productAttribute.findUnique({ where: { code: item.code } });
    if (!attribute) {
      attribute = await prisma.productAttribute.create({
        data: {
          name: item.name,
          code: item.code,
          slug: item.slug,
          displayType: item.displayType,
          isVariantAttribute: true,
          isSpecificationAttribute: item.code !== "COLOR" && item.code !== "SIZE",
          sortOrder: item.sortOrder,
        },
      });
      createdAttributes++;
    }

    for (const [name, code, hexCode] of item.values) {
      const existing = await prisma.productAttributeValue.findUnique({
        where: { attributeId_code: { attributeId: attribute.id, code: String(code) } },
      });
      if (existing) {
        skippedValues++;
        continue;
      }
      await prisma.productAttributeValue.create({
        data: {
          attributeId: attribute.id,
          name: String(name),
          code: String(code),
          slug: normalizeValueSlug(String(name)),
          hexCode: hexCode ? String(hexCode) : null,
          sortOrder: createdValues + 1,
        },
      });
      createdValues++;
    }
  }

  return { createdAttributes, createdValues, skippedValues };
}

export async function listAttributeOptions(options?: {
  type?: ProductAttributeType;
  status?: ProductAttributeStatus;
}) {
  return prisma.productAttributeOption.findMany({
    where: {
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createAttributeOption(data: {
  type: ProductAttributeType;
  name: string;
  code?: string;
  value?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}) {
  return prisma.productAttributeOption.create({
    data: {
      type: data.type,
      name: data.name,
      code: data.code,
      value: data.value,
      sortOrder: data.sortOrder ?? 0,
      ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function updateAttributeOption(id: string, data: {
  name?: string;
  code?: string;
  value?: string;
  sortOrder?: number;
  status?: ProductAttributeStatus;
}) {
  return prisma.productAttributeOption.update({
    where: { id },
    data,
  });
}

export async function deleteAttributeOption(id: string) {
  return prisma.productAttributeOption.delete({ where: { id } });
}

// ─── Seed defaults ────────────────────────────────────────────────────────────

type SeedEntry = {
  type: ProductAttributeType;
  name: string;
  code?: string;
  value?: string;
  sortOrder: number;
};

const DEFAULT_ATTRIBUTES: SeedEntry[] = [
  // Colors
  { type: "COLOR", name: "Đen", code: "BLK", value: "#000000", sortOrder: 1 },
  { type: "COLOR", name: "Trắng", code: "WHT", value: "#FFFFFF", sortOrder: 2 },
  { type: "COLOR", name: "Xám", code: "GRY", value: "#9CA3AF", sortOrder: 3 },
  { type: "COLOR", name: "Xanh navy", code: "NVY", value: "#1E3A5F", sortOrder: 4 },
  { type: "COLOR", name: "Xanh dương", code: "BLU", value: "#3B82F6", sortOrder: 5 },
  { type: "COLOR", name: "Xanh lá", code: "GRN", value: "#22C55E", sortOrder: 6 },
  { type: "COLOR", name: "Đỏ", code: "RED", value: "#EF4444", sortOrder: 7 },
  { type: "COLOR", name: "Vàng", code: "YEL", value: "#EAB308", sortOrder: 8 },
  { type: "COLOR", name: "Cam", code: "ORG", value: "#F97316", sortOrder: 9 },
  { type: "COLOR", name: "Be / Natural", code: "NT", value: "#D4A96A", sortOrder: 10 },
  { type: "COLOR", name: "Hồng", code: "PNK", value: "#EC4899", sortOrder: 11 },
  // Sizes
  { type: "SIZE", name: "XS", code: "XS", sortOrder: 1 },
  { type: "SIZE", name: "S", code: "S", sortOrder: 2 },
  { type: "SIZE", name: "M", code: "M", sortOrder: 3 },
  { type: "SIZE", name: "L", code: "L", sortOrder: 4 },
  { type: "SIZE", name: "XL", code: "XL", sortOrder: 5 },
  { type: "SIZE", name: "2XL", code: "2XL", sortOrder: 6 },
  { type: "SIZE", name: "3XL", code: "3XL", sortOrder: 7 },
  { type: "SIZE", name: "Free size", code: "ONESZ", sortOrder: 8 },
  // Materials
  { type: "MATERIAL", name: "Cotton 100%", code: "CT", sortOrder: 1 },
  { type: "MATERIAL", name: "CVC (Cotton-Viscose)", code: "CVC", sortOrder: 2 },
  { type: "MATERIAL", name: "TC (Polyester-Cotton)", code: "TC", sortOrder: 3 },
  { type: "MATERIAL", name: "Cá sấu poly (Polyester pique)", code: "PL-PQ", sortOrder: 4 },
  { type: "MATERIAL", name: "Cá sấu cotton (Cotton pique)", code: "CT-PQ", sortOrder: 5 },
  { type: "MATERIAL", name: "Polyester", code: "PL", sortOrder: 6 },
  { type: "MATERIAL", name: "Canvas 280gsm", code: "CAN280", sortOrder: 7 },
  { type: "MATERIAL", name: "Vải không dệt (Non-woven)", code: "NW", sortOrder: 8 },
  { type: "MATERIAL", name: "Inox 304", code: "INX304", sortOrder: 9 },
  { type: "MATERIAL", name: "Tritan (nhựa cao cấp)", code: "TRI", sortOrder: 10 },
  // Forms
  { type: "FORM", name: "Basic / Regular", code: "BASIC", sortOrder: 1 },
  { type: "FORM", name: "Oversize", code: "OVER", sortOrder: 2 },
  { type: "FORM", name: "Slim fit", code: "SLIM", sortOrder: 3 },
  { type: "FORM", name: "Unisex", code: "UNISEX", sortOrder: 4 },
  // Fits
  { type: "FIT", name: "Regular fit", code: "REG", sortOrder: 1 },
  { type: "FIT", name: "Slim fit", code: "SLIM", sortOrder: 2 },
  { type: "FIT", name: "Oversize", code: "OVER", sortOrder: 3 },
  // Capacities
  { type: "CAPACITY", name: "350ml", code: "350ML", sortOrder: 1 },
  { type: "CAPACITY", name: "500ml", code: "500ML", sortOrder: 2 },
  { type: "CAPACITY", name: "600ml", code: "600ML", sortOrder: 3 },
  { type: "CAPACITY", name: "750ml", code: "750ML", sortOrder: 4 },
  // Dimensions
  { type: "DIMENSION", name: "35x40cm", code: "3540", sortOrder: 1 },
  { type: "DIMENSION", name: "40x35cm", code: "4035", sortOrder: 2 },
  { type: "DIMENSION", name: "60x60cm", code: "6060", sortOrder: 3 },
  { type: "DIMENSION", name: "55x55cm", code: "5555", sortOrder: 4 },
];

export async function seedDefaultAttributeOptions(): Promise<{ created: number; skipped: number; total: number }> {
  let created = 0;
  let skipped = 0;
  for (const attr of DEFAULT_ATTRIBUTES) {
    const existing = await prisma.productAttributeOption.findFirst({
      where: { type: attr.type, name: attr.name },
    });
    if (existing) { skipped++; continue; }
    await prisma.productAttributeOption.create({
      data: {
        type: attr.type,
        name: attr.name,
        code: attr.code,
        value: attr.value,
        sortOrder: attr.sortOrder,
      },
    });
    created++;
  }
  return { created, skipped, total: DEFAULT_ATTRIBUTES.length };
}
