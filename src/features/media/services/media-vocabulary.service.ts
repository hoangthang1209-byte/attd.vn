import type { MediaVocabularyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import { normalizeSemanticTerms } from "@/features/media/services/media-intelligence.service";

export type MediaVocabularyTermRecord = {
  id: string;
  type: MediaVocabularyType;
  code: string | null;
  name: string;
  aliases: string[];
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaVocabularyTermInput = {
  type: MediaVocabularyType;
  code?: string | null;
  name: string;
  aliases?: string[];
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateMediaVocabularyTermInput = {
  name?: string;
  aliases?: string[];
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  code?: string | null;
};

const VALID_TYPES: MediaVocabularyType[] = [
  "SUBJECT",
  "MATERIAL",
  "COLOR",
  "TECHNIQUE",
  "INDUSTRY",
  "AUDIENCE",
  "USE_CASE",
];

export function validateMediaVocabularyType(value: unknown): MediaVocabularyType | null {
  if (typeof value !== "string") return null;
  return VALID_TYPES.includes(value as MediaVocabularyType)
    ? (value as MediaVocabularyType)
    : null;
}

function mapTerm(row: {
  id: string;
  type: MediaVocabularyType;
  code: string | null;
  name: string;
  aliases: string[];
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount?: number;
}): MediaVocabularyTermRecord {
  return {
    id: row.id,
    type: row.type,
    code: row.code,
    name: row.name,
    aliases: row.aliases,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSystem: row.isSystem,
    usageCount: row.usageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function countTermUsage(type: MediaVocabularyType, name: string): Promise<number> {
  const field =
    type === "SUBJECT"
      ? "subjectTerms"
      : type === "MATERIAL"
        ? "materialTerms"
        : type === "COLOR"
          ? "colorTerms"
          : type === "TECHNIQUE"
            ? "techniqueTerms"
            : type === "INDUSTRY"
              ? "industryTerms"
              : type === "AUDIENCE"
                ? "audienceTerms"
                : "useCaseTerms";

  return prisma.mediaAsset.count({
    where: { [field]: { has: name } },
  });
}

export async function listMediaVocabularyTerms(options?: {
  type?: MediaVocabularyType;
  activeOnly?: boolean;
  search?: string;
  includeUsage?: boolean;
}): Promise<MediaVocabularyTermRecord[]> {
  const search = options?.search?.trim();
  const rows = await prisma.mediaVocabularyTerm.findMany({
    where: {
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { aliases: { has: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  if (!options?.includeUsage) return rows.map(mapTerm);

  const mapped: MediaVocabularyTermRecord[] = [];
  for (const row of rows) {
    const usageCount = await countTermUsage(row.type, row.name);
    mapped.push(mapTerm({ ...row, usageCount }));
  }
  return mapped;
}

export async function getMediaVocabularyTermById(
  id: string,
  options?: { includeUsage?: boolean },
): Promise<MediaVocabularyTermRecord | null> {
  const row = await prisma.mediaVocabularyTerm.findUnique({ where: { id } });
  if (!row) return null;
  const usageCount = options?.includeUsage ? await countTermUsage(row.type, row.name) : undefined;
  return mapTerm({ ...row, usageCount });
}

export async function createMediaVocabularyTerm(
  input: CreateMediaVocabularyTermInput,
): Promise<MediaVocabularyTermRecord> {
  const type = validateMediaVocabularyType(input.type);
  if (!type) throw new Error("Loại từ điển không hợp lệ.");

  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Tên thuật ngữ là bắt buộc.");

  let code: string | null = null;
  if (input.code != null && String(input.code).trim()) {
    code = normalizeMasterDataCode(String(input.code));
    if (!code) throw new Error("Mã thuật ngữ không hợp lệ.");
  }

  const aliases = normalizeSemanticTerms(input.aliases);

  try {
    const row = await prisma.mediaVocabularyTerm.create({
      data: {
        type,
        code,
        name,
        aliases,
        description: input.description?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        isSystem: false,
      },
    });
    return mapTerm(row);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      throw new Error("Thuật ngữ đã tồn tại trong loại này.");
    }
    throw err;
  }
}

export async function updateMediaVocabularyTerm(
  id: string,
  input: UpdateMediaVocabularyTermInput,
): Promise<MediaVocabularyTermRecord> {
  const existing = await prisma.mediaVocabularyTerm.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy thuật ngữ.");

  const data: {
    name?: string;
    aliases?: string[];
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    code?: string | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) throw new Error("Tên thuật ngữ là bắt buộc.");
    data.name = name;
  }

  if (input.aliases !== undefined) {
    data.aliases = normalizeSemanticTerms(input.aliases);
  }

  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }

  if (input.sortOrder !== undefined) {
    if (!Number.isFinite(input.sortOrder)) throw new Error("Thứ tự sắp xếp không hợp lệ.");
    data.sortOrder = input.sortOrder;
  }

  if (input.isActive !== undefined) data.isActive = input.isActive;

  if (input.code !== undefined) {
    if (existing.isSystem && existing.code) {
      throw new Error("Không thể đổi mã của thuật ngữ hệ thống.");
    }
    if (input.code === null || input.code === "") {
      data.code = null;
    } else {
      const code = normalizeMasterDataCode(String(input.code));
      if (!code) throw new Error("Mã thuật ngữ không hợp lệ.");
      data.code = code;
    }
  }

  try {
    const row = await prisma.mediaVocabularyTerm.update({ where: { id }, data });
    return mapTerm(row);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      throw new Error("Thuật ngữ đã tồn tại trong loại này.");
    }
    throw err;
  }
}

export async function deleteMediaVocabularyTerm(id: string): Promise<void> {
  const existing = await prisma.mediaVocabularyTerm.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy thuật ngữ.");
  if (existing.isSystem) throw new Error("Không thể xóa thuật ngữ hệ thống.");

  const usage = await countTermUsage(existing.type, existing.name);
  if (usage > 0) {
    throw new Error(
      `Thuật ngữ đang được dùng bởi ${usage} ảnh. Hãy vô hiệu hóa thay vì xóa.`,
    );
  }

  await prisma.mediaVocabularyTerm.delete({ where: { id } });
}
