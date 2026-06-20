import { prisma } from "@/lib/prisma";

export class ColorValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ColorValidationError";
  }
}

export type ColorRecord = {
  id: string;
  name: string;
  slug: string;
  hex: string | null;
  isActive: boolean;
  sortOrder: number;
};

function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || "mau";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.color.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }
}

function mapRow(row: {
  id: string;
  name: string;
  slug: string;
  hex: string | null;
  isActive: boolean;
  sortOrder: number;
}): ColorRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    hex: row.hex,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function listColors(params?: { activeOnly?: boolean; search?: string }) {
  const search = params?.search?.trim();
  const where: {
    isActive?: boolean;
    OR?: Array<Record<string, unknown>>;
  } = {};
  if (params?.activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.color.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return { colors: rows.map(mapRow), total: rows.length };
}

export async function createColor(input: {
  name: string;
  hex?: string | null;
  sortOrder?: number;
}): Promise<ColorRecord> {
  const name = input.name.trim();
  if (!name) throw new ColorValidationError("Tên màu là bắt buộc.");

  const duplicate = await prisma.color.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (duplicate) throw new ColorValidationError("Màu này đã tồn tại trong hệ thống.");

  const slug = await ensureUniqueSlug(toSlug(name));
  const row = await prisma.color.create({
    data: {
      name,
      slug,
      hex: input.hex?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    },
  });
  return mapRow(row);
}

export async function updateColor(
  id: string,
  input: { name?: string; hex?: string | null; isActive?: boolean; sortOrder?: number },
): Promise<ColorRecord> {
  const existing = await prisma.color.findUnique({ where: { id } });
  if (!existing) throw new ColorValidationError("Không tìm thấy màu.");

  const row = await prisma.color.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.hex !== undefined ? { hex: input.hex?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  return mapRow(row);
}

export async function getColorById(id: string): Promise<ColorRecord | null> {
  const row = await prisma.color.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}
