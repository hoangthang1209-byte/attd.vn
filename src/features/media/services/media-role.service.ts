import { prisma } from "@/lib/prisma";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import type {
  CreateMediaMasterDataInput,
  MediaMasterDataRecord,
  UpdateMediaMasterDataInput,
} from "@/features/media/media-master-data.types";

function mapRole(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assets: number };
}): MediaMasterDataRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSystem: row.isSystem,
    assetCount: row._count?.assets,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMediaRoles(options?: {
  activeOnly?: boolean;
  includeCounts?: boolean;
}): Promise<MediaMasterDataRecord[]> {
  const rows = await prisma.mediaRole.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: options?.includeCounts ? { _count: { select: { assets: true } } } : undefined,
  });
  return rows.map(mapRole);
}

export async function getMediaRoleById(id: string): Promise<MediaMasterDataRecord | null> {
  const row = await prisma.mediaRole.findUnique({
    where: { id },
    include: { _count: { select: { assets: true } } },
  });
  return row ? mapRole(row) : null;
}

export async function getMediaRoleByCode(code: string): Promise<MediaMasterDataRecord | null> {
  const row = await prisma.mediaRole.findUnique({
    where: { code: normalizeMasterDataCode(code) },
    include: { _count: { select: { assets: true } } },
  });
  return row ? mapRole(row) : null;
}

export async function createMediaRole(
  input: CreateMediaMasterDataInput,
): Promise<MediaMasterDataRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên vai trò hiển thị là bắt buộc.");

  const code = normalizeMasterDataCode(input.code);
  if (!code) throw new Error("Mã vai trò hiển thị là bắt buộc.");

  const duplicate = await prisma.mediaRole.findUnique({ where: { code } });
  if (duplicate) throw new Error("Mã vai trò hiển thị đã tồn tại.");

  if (input.sortOrder !== undefined && !Number.isFinite(input.sortOrder)) {
    throw new Error("Thứ tự sắp xếp không hợp lệ.");
  }

  const row = await prisma.mediaRole.create({
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isSystem: false,
    },
  });
  return mapRole(row);
}

export async function updateMediaRole(
  id: string,
  input: UpdateMediaMasterDataInput,
): Promise<MediaMasterDataRecord> {
  const existing = await prisma.mediaRole.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy vai trò hiển thị.");

  const data: {
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Tên vai trò hiển thị là bắt buộc.");
    data.name = name;
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.sortOrder !== undefined) {
    if (!Number.isFinite(input.sortOrder)) throw new Error("Thứ tự sắp xếp không hợp lệ.");
    data.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") throw new Error("Trạng thái kích hoạt không hợp lệ.");
    data.isActive = input.isActive;
  }

  const row = await prisma.mediaRole.update({ where: { id }, data });
  return mapRole(row);
}

export async function deleteMediaRole(id: string): Promise<void> {
  const existing = await prisma.mediaRole.findUnique({
    where: { id },
    include: { _count: { select: { assets: true } } },
  });
  if (!existing) throw new Error("Không tìm thấy vai trò hiển thị.");
  if (existing.isSystem) throw new Error("Không thể xóa vai trò hệ thống.");
  if (existing._count.assets > 0) {
    throw new Error("Không thể xóa vai trò đang có ảnh. Hãy vô hiệu hóa thay vì xóa.");
  }
  await prisma.mediaRole.delete({ where: { id } });
}
