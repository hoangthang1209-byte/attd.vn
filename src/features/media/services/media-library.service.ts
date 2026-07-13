import { prisma } from "@/lib/prisma";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import type {
  CreateMediaMasterDataInput,
  MediaMasterDataRecord,
  UpdateMediaMasterDataInput,
} from "@/features/media/media-master-data.types";

function mapLibrary(row: {
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

export async function listMediaLibraries(options?: {
  activeOnly?: boolean;
  includeCounts?: boolean;
}): Promise<MediaMasterDataRecord[]> {
  const rows = await prisma.mediaLibrary.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: options?.includeCounts ? { _count: { select: { assets: true } } } : undefined,
  });
  return rows.map(mapLibrary);
}

export async function getMediaLibraryById(id: string): Promise<MediaMasterDataRecord | null> {
  const row = await prisma.mediaLibrary.findUnique({
    where: { id },
    include: { _count: { select: { assets: true } } },
  });
  return row ? mapLibrary(row) : null;
}

export async function getMediaLibraryByCode(code: string): Promise<MediaMasterDataRecord | null> {
  const row = await prisma.mediaLibrary.findUnique({
    where: { code: normalizeMasterDataCode(code) },
    include: { _count: { select: { assets: true } } },
  });
  return row ? mapLibrary(row) : null;
}

export async function createMediaLibrary(
  input: CreateMediaMasterDataInput,
): Promise<MediaMasterDataRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên thư viện ảnh là bắt buộc.");

  const code = normalizeMasterDataCode(input.code);
  if (!code) throw new Error("Mã thư viện ảnh là bắt buộc.");

  const duplicate = await prisma.mediaLibrary.findUnique({ where: { code } });
  if (duplicate) throw new Error("Mã thư viện ảnh đã tồn tại.");

  if (input.sortOrder !== undefined && !Number.isFinite(input.sortOrder)) {
    throw new Error("Thứ tự sắp xếp không hợp lệ.");
  }

  const row = await prisma.mediaLibrary.create({
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isSystem: false,
    },
  });
  return mapLibrary(row);
}

export async function updateMediaLibrary(
  id: string,
  input: UpdateMediaMasterDataInput,
): Promise<MediaMasterDataRecord> {
  const existing = await prisma.mediaLibrary.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy thư viện ảnh.");

  const data: {
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Tên thư viện ảnh là bắt buộc.");
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

  const row = await prisma.mediaLibrary.update({ where: { id }, data });
  return mapLibrary(row);
}

export async function deleteMediaLibrary(id: string): Promise<void> {
  const existing = await prisma.mediaLibrary.findUnique({
    where: { id },
    include: { _count: { select: { assets: true } } },
  });
  if (!existing) throw new Error("Không tìm thấy thư viện ảnh.");
  if (existing.isSystem) throw new Error("Không thể xóa thư viện hệ thống.");
  if (existing._count.assets > 0) {
    throw new Error("Không thể xóa thư viện đang có ảnh. Hãy vô hiệu hóa thay vì xóa.");
  }
  await prisma.mediaLibrary.delete({ where: { id } });
}
