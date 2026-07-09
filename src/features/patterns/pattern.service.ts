import {
  PatternFileType,
  PatternSourceType,
  PatternStatus,
  Prisma,
  ProductionMaterialCategory,
  type Pattern,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePatternCode } from "@/features/patterns/pattern-code";
import type { PatternMeasurementInput } from "@/features/patterns/pattern-update-input";
import { deleteR2Object } from "@/features/storage/r2/r2-production-file.service";

export class PatternValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
    public readonly code?: "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "PERMISSION",
  ) {
    super(message);
    this.name = "PatternValidationError";
  }
}

const PATTERN_CATEGORY_VISUAL_SELECT = {
  id: true,
  name: true,
  parentId: true,
  skuCode: true,
  imageUrl: true,
  products: {
    where: { status: "ACTIVE" as const },
    take: 1,
    select: { featuredImage: true },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

const PATTERN_INCLUDE = {
  productCategory: { select: PATTERN_CATEGORY_VISUAL_SELECT },
  product: { select: { id: true, name: true, productCode: true } },
  customer: { select: { id: true, name: true, code: true } },
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
      { sourceSupplier: { contains: q, mode: "insensitive" } },
      { customerNameSnapshot: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { code: { contains: q, mode: "insensitive" } } },
    ];
  }

  const items = await prisma.pattern.findMany({
    where,
    include: {
      productCategory: { select: PATTERN_CATEGORY_VISUAL_SELECT },
      customer: { select: { id: true, name: true, code: true } },
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
    sourceType: PatternSourceType | null;
    sourceSupplier: string | null;
    sourceSupplierContact: string | null;
    sourcePhone: string | null;
    sourceEmail: string | null;
    customerId: string | null;
    customerNameSnapshot: string | null;
    sourceNotes: string | null;
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
  if (input.sourceType !== undefined) data.sourceType = input.sourceType;
  if (input.sourceSupplier !== undefined) data.sourceSupplier = input.sourceSupplier?.trim() || null;
  if (input.sourceSupplierContact !== undefined) {
    data.sourceSupplierContact = input.sourceSupplierContact?.trim() || null;
  }
  if (input.sourcePhone !== undefined) data.sourcePhone = input.sourcePhone?.trim() || null;
  if (input.sourceEmail !== undefined) data.sourceEmail = input.sourceEmail?.trim() || null;
  if (input.customerId !== undefined) data.customerId = input.customerId;
  if (input.customerNameSnapshot !== undefined) {
    data.customerNameSnapshot = input.customerNameSnapshot?.trim() || null;
  }
  if (input.sourceNotes !== undefined) data.sourceNotes = input.sourceNotes?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  return data;
}

function mapPatternPrismaError(err: unknown): PatternValidationError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (process.env.NODE_ENV === "development") {
    console.error("[pattern.prisma.error]", {
      code: err.code,
      modelName: err.meta?.modelName,
      target: err.meta?.target,
    });
  }
  if (err.code === "P2003") {
    return new PatternValidationError("Danh mục hoặc sản phẩm liên kết không hợp lệ.");
  }
  if (err.code === "P2002") {
    return new PatternValidationError(
      "Bảng đo có cột size hoặc điểm đo bị trùng.",
      undefined,
      "CONFLICT",
    );
  }
  if (err.code === "P2025") {
    return new PatternValidationError("Không tìm thấy dữ liệu rập cần cập nhật.", undefined, "NOT_FOUND");
  }
  if (err.code === "P2014") {
    return new PatternValidationError(
      "Không thể lưu bảng đo vì dữ liệu liên kết không hợp lệ.",
      undefined,
      "CONFLICT",
    );
  }
  return null;
}

function patternMeasurementCreateInput(
  patternId: string,
  row: PatternMeasurementInput,
  index: number,
): Prisma.PatternMeasurementCreateInput | null {
  const pom = row.pointOfMeasure.trim();
  if (!pom) return null;

  const seenSizes = new Set<string>();
  const values = row.values.flatMap((val) => {
    const size = val.size.trim();
    const value = val.value.trim();
    if (!size || !value || seenSizes.has(size)) return [];
    seenSizes.add(size);

    return { size, value };
  });

  return {
    pattern: { connect: { id: patternId } },
    pointOfMeasure: pom,
    description: row.description?.trim() || null,
    baseSize: row.baseSize?.trim() || null,
    tolerance: row.tolerance?.trim() || null,
    sortOrder: row.sortOrder ?? index,
    values: values.length > 0 ? { create: values } : undefined,
  };
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
    sourceType: PatternSourceType | null;
    sourceSupplier: string | null;
    sourceSupplierContact: string | null;
    sourcePhone: string | null;
    sourceEmail: string | null;
    customerId: string | null;
    customerNameSnapshot: string | null;
    sourceNotes: string | null;
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
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (hasMetadataPatch) {
      operations.push(
        prisma.pattern.update({
          where: { id },
          data: metadataPatch,
        }),
      );
    }

    if (input.measurements !== undefined) {
      operations.push(
        prisma.patternMeasurementValue.deleteMany({
          where: { measurement: { patternId: id } },
        }),
        prisma.patternMeasurement.deleteMany({ where: { patternId: id } }),
      );

      for (const [index, row] of input.measurements.entries()) {
        const data = patternMeasurementCreateInput(id, row, index);
        if (!data) continue;
        operations.push(prisma.patternMeasurement.create({ data }));
      }
    }

    operations.push(prisma.pattern.findUniqueOrThrow({ where: { id }, include: PATTERN_INCLUDE }));

    const result = await prisma.$transaction(operations);
    return result.at(-1) as PatternDetail;
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

export async function deletePattern(id: string): Promise<{
  ok: true;
  storageWarnings: string[];
}> {
  const pattern = await prisma.pattern.findUnique({
    where: { id },
    include: { files: { select: { r2ObjectKey: true, cloudinaryPublicId: true } } },
  });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.", undefined, "NOT_FOUND");

  const r2Keys = pattern.files
    .map((file) => file.r2ObjectKey)
    .filter((key): key is string => Boolean(key));

  await prisma.pattern.delete({ where: { id } });

  const storageWarnings: string[] = [];
  for (const key of r2Keys) {
    try {
      await deleteR2Object(key);
    } catch {
      storageWarnings.push(key);
    }
  }

  return { ok: true, storageWarnings };
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
    fileSizeBytes?: number | null;
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
      fileSizeBytes: input.fileSizeBytes ?? null,
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
  if (file.r2ObjectKey) {
    try {
      await deleteR2Object(file.r2ObjectKey);
    } catch {
      // DB row removed; storage cleanup is best-effort.
    }
  }
  return { ok: true };
}

export function mapPatternForList(pattern: Pattern & { productCategory?: { name: string } | null }) {
  return pattern;
}
