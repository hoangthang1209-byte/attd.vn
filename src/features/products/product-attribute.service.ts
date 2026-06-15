import type { ProductAttributeType, ProductAttributeStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
