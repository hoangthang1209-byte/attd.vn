import { prisma } from "@/lib/prisma";

export class DeliveryMethodValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryMethodValidationError";
  }
}

export type DeliveryMethodRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  requiresCarrier: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeliveryMethodInput = {
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateDeliveryMethodInput = Partial<CreateDeliveryMethodInput>;

function mapRow(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  requiresCarrier: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DeliveryMethodRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    requiresCarrier: row.requiresCarrier,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function generateDeliveryMethodCode(): Promise<string> {
  const rows = await prisma.deliveryMethod.findMany({ select: { code: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.code.match(/^GH-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `GH-${String(max + 1).padStart(6, "0")}`;
}

export async function listDeliveryMethods(params?: {
  activeOnly?: boolean;
  search?: string;
}) {
  const search = params?.search?.trim();
  const where: {
    isActive?: boolean;
    OR?: Array<Record<string, unknown>>;
  } = {};
  if (params?.activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.deliveryMethod.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return { deliveryMethods: rows.map(mapRow), total: rows.length };
}

export async function getDeliveryMethodById(id: string): Promise<DeliveryMethodRecord | null> {
  const row = await prisma.deliveryMethod.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function createDeliveryMethod(input: CreateDeliveryMethodInput): Promise<DeliveryMethodRecord> {
  const name = input.name.trim();
  if (!name) throw new DeliveryMethodValidationError("Tên hình thức giao hàng là bắt buộc.");

  const code = await generateDeliveryMethodCode();
  const row = await prisma.deliveryMethod.create({
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  return mapRow(row);
}

export async function updateDeliveryMethod(
  id: string,
  input: UpdateDeliveryMethodInput,
): Promise<DeliveryMethodRecord> {
  const existing = await prisma.deliveryMethod.findUnique({ where: { id } });
  if (!existing) throw new DeliveryMethodValidationError("Không tìm thấy hình thức giao hàng.");

  const row = await prisma.deliveryMethod.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return mapRow(row);
}

export async function resolveDeliveryMethodSnapshot(
  deliveryMethodId: string | null | undefined,
  options?: { allowInactiveId?: string | null },
) {
  if (!deliveryMethodId) {
    return { deliveryMethodId: null, deliveryMethodName: null, deliveryMethod: null };
  }
  const method = await prisma.deliveryMethod.findUnique({ where: { id: deliveryMethodId } });
  if (!method) throw new DeliveryMethodValidationError("Hình thức giao hàng không hợp lệ.");
  if (!method.isActive && method.id !== options?.allowInactiveId) {
    throw new DeliveryMethodValidationError("Hình thức giao hàng đã ngừng sử dụng.");
  }
  return {
    deliveryMethodId: method.id,
    deliveryMethodName: method.name,
    deliveryMethod: method.name,
  };
}

export const DEFAULT_DELIVERY_METHODS = [
  { name: "Giao nội bộ", sortOrder: 1, requiresCarrier: false },
  { name: "Giao qua đơn vị vận chuyển", sortOrder: 2, requiresCarrier: true },
  { name: "Khách tự nhận", sortOrder: 3, requiresCarrier: false },
  { name: "Giao xe tải / chành xe", sortOrder: 4, requiresCarrier: false },
] as const;

export async function seedDefaultDeliveryMethodsIfEmpty(): Promise<{ created: number; skipped: boolean }> {
  const count = await prisma.deliveryMethod.count();
  if (count > 0) return { created: 0, skipped: true };

  let created = 0;
  for (const item of DEFAULT_DELIVERY_METHODS) {
    const code = await generateDeliveryMethodCode();
    await prisma.deliveryMethod.create({
      data: {
        code,
        name: item.name,
        sortOrder: item.sortOrder,
        requiresCarrier: item.requiresCarrier,
        isActive: true,
      },
    });
    created += 1;
  }
  return { created, skipped: false };
}
