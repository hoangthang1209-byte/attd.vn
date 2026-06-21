import { prisma } from "@/lib/prisma";

export class DeliveryCarrierValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryCarrierValidationError";
  }
}

export type DeliveryCarrierRecord = {
  id: string;
  carrierCode: string;
  name: string;
  shortName: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  apiProviderKey: string | null;
  apiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeliveryCarrierInput = {
  name: string;
  shortName?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  apiProviderKey?: string | null;
  apiEnabled?: boolean;
};

export type UpdateDeliveryCarrierInput = Partial<CreateDeliveryCarrierInput>;

function mapRow(row: {
  id: string;
  carrierCode: string;
  name: string;
  shortName: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  apiProviderKey: string | null;
  apiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DeliveryCarrierRecord {
  return {
    id: row.id,
    carrierCode: row.carrierCode,
    name: row.name,
    shortName: row.shortName,
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    apiProviderKey: row.apiProviderKey,
    apiEnabled: row.apiEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function generateDeliveryCarrierCode(): Promise<string> {
  const rows = await prisma.deliveryCarrier.findMany({ select: { carrierCode: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.carrierCode.match(/^VC-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `VC-${String(max + 1).padStart(6, "0")}`;
}

export async function listDeliveryCarriers(params?: {
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
      { carrierCode: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { shortName: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.deliveryCarrier.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return { deliveryCarriers: rows.map(mapRow), total: rows.length };
}

export async function getDeliveryCarrierById(id: string): Promise<DeliveryCarrierRecord | null> {
  const row = await prisma.deliveryCarrier.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function createDeliveryCarrier(
  input: CreateDeliveryCarrierInput,
): Promise<DeliveryCarrierRecord> {
  const name = input.name.trim();
  if (!name) throw new DeliveryCarrierValidationError("Tên đơn vị vận chuyển là bắt buộc.");

  const carrierCode = await generateDeliveryCarrierCode();
  const row = await prisma.deliveryCarrier.create({
    data: {
      carrierCode,
      name,
      shortName: input.shortName?.trim() || null,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      apiProviderKey: input.apiProviderKey?.trim() || null,
      apiEnabled: input.apiEnabled ?? false,
    },
  });
  return mapRow(row);
}

export async function updateDeliveryCarrier(
  id: string,
  input: UpdateDeliveryCarrierInput,
): Promise<DeliveryCarrierRecord> {
  const existing = await prisma.deliveryCarrier.findUnique({ where: { id } });
  if (!existing) throw new DeliveryCarrierValidationError("Không tìm thấy đơn vị vận chuyển.");

  const row = await prisma.deliveryCarrier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.shortName !== undefined ? { shortName: input.shortName?.trim() || null } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.apiProviderKey !== undefined
        ? { apiProviderKey: input.apiProviderKey?.trim() || null }
        : {}),
      ...(input.apiEnabled !== undefined ? { apiEnabled: input.apiEnabled } : {}),
    },
  });
  return mapRow(row);
}

export async function resolveDeliveryCarrierSnapshot(
  deliveryCarrierId: string | null | undefined,
  options?: { allowInactiveId?: string | null },
) {
  if (!deliveryCarrierId) {
    return { deliveryCarrierId: null, deliveryCarrierName: null };
  }
  const carrier = await prisma.deliveryCarrier.findUnique({ where: { id: deliveryCarrierId } });
  if (!carrier) throw new DeliveryCarrierValidationError("Đơn vị vận chuyển không hợp lệ.");
  if (!carrier.isActive && carrier.id !== options?.allowInactiveId) {
    throw new DeliveryCarrierValidationError("Đơn vị vận chuyển đã ngừng sử dụng.");
  }
  return {
    deliveryCarrierId: carrier.id,
    deliveryCarrierName: carrier.name,
  };
}

export const DEFAULT_DELIVERY_CARRIERS = [
  { name: "Giao Hàng Tiết Kiệm", shortName: "GHTK", sortOrder: 1 },
  { name: "Giao Hàng Nhanh", shortName: "GHN", sortOrder: 2 },
  { name: "Viettel Post", shortName: "Viettel Post", sortOrder: 3 },
  { name: "J&T Express", shortName: "J&T", sortOrder: 4 },
  { name: "Ahamove", shortName: "Ahamove", sortOrder: 5 },
  { name: "Xe công ty", shortName: "Xe nội bộ", sortOrder: 6 },
  { name: "Chành xe", shortName: "Chành xe", sortOrder: 7 },
] as const;

export async function seedDefaultDeliveryCarriersIfEmpty(): Promise<{ created: number; skipped: boolean }> {
  const count = await prisma.deliveryCarrier.count();
  if (count > 0) return { created: 0, skipped: true };

  let created = 0;
  for (const item of DEFAULT_DELIVERY_CARRIERS) {
    await createDeliveryCarrier({
      name: item.name,
      shortName: item.shortName,
      sortOrder: item.sortOrder,
    });
    created += 1;
  }
  return { created, skipped: false };
}
