import {
  PatternFileType,
  PatternStatus,
  Prisma,
  ProductionMaterialCategory,
  type Pattern,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePatternCode } from "@/features/patterns/pattern-code";

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
    measurements: Array<{
      id?: string;
      pointOfMeasure: string;
      description?: string | null;
      baseSize?: string | null;
      tolerance?: string | null;
      sortOrder?: number;
      values?: Array<{ size: string; value: string }>;
    }>;
  }>,
) {
  const existing = await prisma.pattern.findUnique({ where: { id } });
  if (!existing) throw new PatternValidationError("Không tìm thấy rập.");

  if (existing.status === PatternStatus.ARCHIVED) {
    throw new PatternValidationError("Rập đã lưu trữ, không thể chỉnh sửa.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.pattern.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? undefined,
        version: input.version ?? undefined,
        productCategoryId: input.productCategoryId,
        productId: input.productId,
        baseSize: input.baseSize,
        sizeRange: input.sizeRange,
        gradingRule: input.gradingRule,
        productionMaterialCategory: input.productionMaterialCategory as never,
        notes: input.notes,
      },
    });

    if (input.measurements) {
      await tx.patternMeasurementValue.deleteMany({
        where: { measurement: { patternId: id } },
      });
      await tx.patternMeasurement.deleteMany({ where: { patternId: id } });

      for (const [index, row] of input.measurements.entries()) {
        const pom = row.pointOfMeasure?.trim();
        if (!pom) continue;
        const measurement = await tx.patternMeasurement.create({
          data: {
            patternId: id,
            pointOfMeasure: pom,
            description: row.description?.trim() || null,
            baseSize: row.baseSize?.trim() || null,
            tolerance: row.tolerance?.trim() || null,
            sortOrder: row.sortOrder ?? index,
          },
        });
        for (const val of row.values ?? []) {
          if (!val.size?.trim() || !val.value?.trim()) continue;
          await tx.patternMeasurementValue.create({
            data: {
              measurementId: measurement.id,
              size: val.size.trim(),
              value: val.value.trim(),
            },
          });
        }
      }
    }

    return tx.pattern.findUniqueOrThrow({ where: { id }, include: PATTERN_INCLUDE });
  });
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
