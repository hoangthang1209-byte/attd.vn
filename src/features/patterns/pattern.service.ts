import {
  PatternFileType,
  PatternStatus,
  Prisma,
  ProductionMaterialCategory,
  type Pattern,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePatternCode } from "@/features/patterns/pattern-code";
import type { PatternMeasurementInput } from "@/features/patterns/pattern-update-input";

export class PatternValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatternValidationError";
  }
}

const PATTERN_INCLUDE = {
  productCategory: { select: { id: true, name: true } },
  product: { select: { id: true, name: true, productCode: true } },
  files: { orderBy: { sortOrder: "asc" as const } },
  measurements: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { size: "asc" as const } } },
  },
  _count: { select: { techPacks: true } },
} satisfies Prisma.PatternInclude;

export type PatternDetail = Prisma.PatternGetPayload<{ include: typeof PATTERN_INCLUDE }>;

export async function listPatterns(input?: {
  status?: PatternStatus;
  productCategoryId?: string;
  search?: string;
  limit?: number;
}) {
  const where: Prisma.PatternWhereInput = {};
  if (input?.status) where.status = input.status;
  if (input?.productCategoryId) where.productCategoryId = input.productCategoryId;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.pattern.findMany({
    where,
    include: {
      productCategory: { select: { id: true, name: true } },
      _count: { select: { files: true, techPacks: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: input?.limit ?? 100,
  });

  return { items };
}

export async function getPatternDetail(id: string): Promise<PatternDetail | null> {
  return prisma.pattern.findUnique({ where: { id }, include: PATTERN_INCLUDE });
}

export async function createPattern(input: {
  name: string;
  productCategoryId?: string | null;
  productId?: string | null;
  baseSize?: string | null;
  sizeRange?: string | null;
  gradingRule?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}) {
  const name = input.name?.trim();
  if (!name) throw new PatternValidationError("Tên rập là bắt buộc.");

  const code = await generatePatternCode();
  return prisma.pattern.create({
    data: {
      code,
      name,
      productCategoryId: input.productCategoryId || null,
      productId: input.productId || null,
      baseSize: input.baseSize?.trim() || null,
      sizeRange: input.sizeRange?.trim() || null,
      gradingRule: input.gradingRule?.trim() || null,
      notes: input.notes?.trim() || null,
      createdBy: input.createdBy?.trim() || null,
    },
    include: PATTERN_INCLUDE,
  });
}

function buildPatternUpdateData(
  input: Partial<{
    name: string;
    version: number;
    productCategoryId: string | null;
    productId: string | null;
    baseSize: string | null;
    sizeRange: string | null;
    gradingRule: string | null;
    productionMaterialCategory: ProductionMaterialCategory | null;
    notes: string | null;
  }>,
): Prisma.PatternUncheckedUpdateInput {
  const data: Prisma.PatternUncheckedUpdateInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new PatternValidationError("Tên rập không được để trống.");
    data.name = name;
  }
  if (input.version !== undefined) data.version = input.version;
  if (input.productCategoryId !== undefined) data.productCategoryId = input.productCategoryId;
  if (input.productId !== undefined) data.productId = input.productId;
  if (input.baseSize !== undefined) data.baseSize = input.baseSize?.trim() || null;
  if (input.sizeRange !== undefined) data.sizeRange = input.sizeRange?.trim() || null;
  if (input.gradingRule !== undefined) data.gradingRule = input.gradingRule?.trim() || null;
  if (input.productionMaterialCategory !== undefined) {
    data.productionMaterialCategory = input.productionMaterialCategory;
  }
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  return data;
}

function mapPatternPrismaError(err: unknown): PatternValidationError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (err.code === "P2003") {
    return new PatternValidationError("Danh mục hoặc sản phẩm liên kết không hợp lệ.");
  }
  if (err.code === "P2002") {
    return new PatternValidationError("Không thể lưu vì dữ liệu rập đã thay đổi. Vui lòng tải lại và thử lại.");
  }
  return null;
}

async function replacePatternMeasurements(
  tx: Prisma.TransactionClient,
  patternId: string,
  measurements: PatternMeasurementInput[],
) {
  await tx.patternMeasurementValue.deleteMany({
    where: { measurement: { patternId } },
  });
  await tx.patternMeasurement.deleteMany({ where: { patternId } });

  for (const [index, row] of measurements.entries()) {
    const pom = row.pointOfMeasure.trim();
    if (!pom) continue;

    const measurement = await tx.patternMeasurement.create({
      data: {
        patternId,
        pointOfMeasure: pom,
        description: row.description?.trim() || null,
        baseSize: row.baseSize?.trim() || null,
        tolerance: row.tolerance?.trim() || null,
        sortOrder: row.sortOrder ?? index,
      },
    });

    const seenSizes = new Set<string>();
    for (const val of row.values) {
      const size = val.size.trim();
      const value = val.value.trim();
      if (!size || !value || seenSizes.has(size)) continue;
      seenSizes.add(size);
      await tx.patternMeasurementValue.create({
        data: {
          measurementId: measurement.id,
          size,
          value,
        },
      });
    }
  }
}

export async function updatePattern(
  id: string,
  input: Partial<{
    name: string;
    version: number;
    productCategoryId: string | null;
    productId: string | null;
    baseSize: string | null;
    sizeRange: string | null;
    gradingRule: string | null;
    productionMaterialCategory: ProductionMaterialCategory | null;
    notes: string | null;
    measurements: PatternMeasurementInput[];
  }>,
) {
  const existing = await prisma.pattern.findUnique({ where: { id } });
  if (!existing) throw new PatternValidationError("Không tìm thấy rập.");

  if (existing.status === PatternStatus.ARCHIVED) {
    throw new PatternValidationError("Rập đã lưu trữ, không thể chỉnh sửa.");
  }

  const metadataPatch = buildPatternUpdateData(input);
  const hasMetadataPatch = Object.keys(metadataPatch).length > 0;

  if (!hasMetadataPatch && input.measurements === undefined) {
    throw new PatternValidationError("Không có dữ liệu để cập nhật.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (hasMetadataPatch) {
        await tx.pattern.update({
          where: { id },
          data: metadataPatch,
        });
      }

      if (input.measurements !== undefined) {
        await replacePatternMeasurements(tx, id, input.measurements);
      }

      return tx.pattern.findUniqueOrThrow({ where: { id }, include: PATTERN_INCLUDE });
    });
  } catch (err) {
    const mapped = mapPatternPrismaError(err);
    if (mapped) throw mapped;
    throw err;
  }
}

export async function approvePattern(id: string, approvedBy?: string | null) {
  const pattern = await prisma.pattern.findUnique({ where: { id } });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.");
  if (pattern.status === PatternStatus.ARCHIVED) {
    throw new PatternValidationError("Rập đã lưu trữ.");
  }

  return prisma.pattern.update({
    where: { id },
    data: {
      status: PatternStatus.APPROVED,
      approvedBy: approvedBy?.trim() || null,
      approvedAt: new Date(),
    },
    include: PATTERN_INCLUDE,
  });
}

export async function archivePattern(id: string) {
  const pattern = await prisma.pattern.findUnique({ where: { id } });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.");

  return prisma.pattern.update({
    where: { id },
    data: { status: PatternStatus.ARCHIVED },
    include: PATTERN_INCLUDE,
  });
}

export async function addPatternFile(
  patternId: string,
  input: {
    type: PatternFileType;
    title?: string | null;
    description?: string | null;
    r2ObjectKey?: string | null;
    cloudinaryPublicId?: string | null;
    previewUrl?: string | null;
    originalFileName?: string | null;
    mimeType?: string | null;
    sortOrder?: number;
  },
) {
  const pattern = await prisma.pattern.findUnique({ where: { id: patternId } });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.");
  if (pattern.status === PatternStatus.ARCHIVED) {
    throw new PatternValidationError("Rập đã lưu trữ.");
  }

  return prisma.patternFile.create({
    data: {
      patternId,
      type: input.type,
      title: input.title?.trim() || null,
      description: input.description?.trim() || null,
      r2ObjectKey: input.r2ObjectKey || null,
      cloudinaryPublicId: input.cloudinaryPublicId || null,
      previewUrl: input.previewUrl || null,
      originalFileName: input.originalFileName || null,
      mimeType: input.mimeType || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updatePatternFile(
  patternId: string,
  fileId: string,
  input: Partial<{
    type: PatternFileType;
    title: string | null;
    description: string | null;
    sortOrder: number;
  }>,
) {
  const file = await prisma.patternFile.findFirst({ where: { id: fileId, patternId } });
  if (!file) throw new PatternValidationError("Không tìm thấy file.");

  return prisma.patternFile.update({
    where: { id: fileId },
    data: {
      type: input.type,
      title: input.title,
      description: input.description,
      sortOrder: input.sortOrder,
    },
  });
}

export async function deletePatternFile(patternId: string, fileId: string) {
  const file = await prisma.patternFile.findFirst({ where: { id: fileId, patternId } });
  if (!file) throw new PatternValidationError("Không tìm thấy file.");
  await prisma.patternFile.delete({ where: { id: fileId } });
  return { ok: true };
}

export function mapPatternForList(pattern: Pattern & { productCategory?: { name: string } | null }) {
  return pattern;
}
