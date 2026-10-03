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
import { resolvePatternSupplierSnapshots } from "@/features/patterns/pattern-supplier-snapshots";
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

const PATTERN_SUPPLIER_SELECT = {
  id: true,
  code: true,
  name: true,
  contact: true,
  phone: true,
  email: true,
  category: true,
} as const;

const PATTERN_INCLUDE = {
  productCategory: { select: PATTERN_CATEGORY_VISUAL_SELECT },
  product: { select: { id: true, name: true, productCode: true } },
  customer: { select: { id: true, name: true, code: true } },
  patternSupplier: { select: PATTERN_SUPPLIER_SELECT },
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
  page?: number;
  pageSize?: number;
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
      { sourceSupplierCode: { contains: q, mode: "insensitive" } },
      { patternSupplier: { name: { contains: q, mode: "insensitive" } } },
      { patternSupplier: { code: { contains: q, mode: "insensitive" } } },
      { customerNameSnapshot: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { code: { contains: q, mode: "insensitive" } } },
      { product: { name: { contains: q, mode: "insensitive" } } },
      { product: { productCode: { contains: q, mode: "insensitive" } } },
      { productCategory: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const pageSize = Math.min(Math.max(input?.pageSize ?? 25, 10), 100);
  const page = Math.max(input?.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const [items, total, allCount, draftCount, approvedCount, archivedCount] =
    await prisma.$transaction([
      prisma.pattern.findMany({
        where,
        include: {
          productCategory: { select: PATTERN_CATEGORY_VISUAL_SELECT },
          product: { select: { id: true, name: true, productCode: true } },
          customer: { select: { id: true, name: true, code: true } },
          patternSupplier: { select: PATTERN_SUPPLIER_SELECT },
          files: {
            where: { title: "__PATTERN_COVER__" },
            orderBy: { createdAt: "desc" as const },
            take: 1,
            select: { id: true, title: true, mimeType: true, type: true },
          },
          _count: { select: { files: true, techPacks: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.pattern.count({ where }),
      prisma.pattern.count(),
      prisma.pattern.count({ where: { status: PatternStatus.DRAFT } }),
      prisma.pattern.count({ where: { status: PatternStatus.APPROVED } }),
      prisma.pattern.count({ where: { status: PatternStatus.ARCHIVED } }),
    ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    stats: {
      all: allCount,
      draft: draftCount,
      approved: approvedCount,
      archived: archivedCount,
    },
  };
}

export async function getPatternDetail(id: string): Promise<PatternDetail | null> {
  return prisma.pattern.findUnique({ where: { id }, include: PATTERN_INCLUDE });
}

export async function createPattern(input: {
  name: string;
  code?: string | null;
  productCategoryId?: string | null;
  productId?: string | null;
  baseSize?: string | null;
  sizeRange?: string | null;
  gradingRule?: string | null;
  productionMaterialCategory?: ProductionMaterialCategory | null;
  sourceType?: PatternSourceType | null;
  patternSupplierId?: string | null;
  sourceSupplierCode?: string | null;
  sourceSupplier?: string | null;
  sourceSupplierContact?: string | null;
  sourcePhone?: string | null;
  sourceEmail?: string | null;
  customerId?: string | null;
  customerNameSnapshot?: string | null;
  sourceNotes?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}) {
  const name = input.name?.trim();
  if (!name) throw new PatternValidationError("Tên rập là bắt buộc.");

  const createData = {
    name,
    productCategoryId: input.productCategoryId || null,
    productId: input.productId || null,
    baseSize: input.baseSize?.trim() || null,
    sizeRange: input.sizeRange?.trim() || null,
    gradingRule: input.gradingRule?.trim() || null,
    productionMaterialCategory: input.productionMaterialCategory ?? null,
    sourceType: input.sourceType ?? null,
    patternSupplierId: input.patternSupplierId || null,
    sourceSupplierCode: input.sourceSupplierCode?.trim() || null,
    sourceSupplier: input.sourceSupplier?.trim() || null,
    sourceSupplierContact: input.sourceSupplierContact?.trim() || null,
    sourcePhone: input.sourcePhone?.trim() || null,
    sourceEmail: input.sourceEmail?.trim() || null,
    customerId: input.customerId || null,
    customerNameSnapshot: input.customerNameSnapshot?.trim() || null,
    sourceNotes: input.sourceNotes?.trim() || null,
    notes: input.notes?.trim() || null,
    createdBy: input.createdBy?.trim() || null,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = attempt === 0 && input.code?.trim() ? input.code.trim() : await generatePatternCode();
    try {
      return await prisma.pattern.create({
        data: { code, ...createData },
        include: PATTERN_INCLUDE,
      });
    } catch (error) {
      const target =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.meta?.target
          : undefined;
      const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        targetText.toLowerCase().includes("code");
      if (!isCodeCollision || attempt === 2) throw error;
    }
  }

  throw new PatternValidationError("Không thể tạo mã rập duy nhất. Vui lòng thử lại.");
}

function buildPatternUpdateData(
  input: Partial<{
    code: string;
    name: string;
    version: number;
    productCategoryId: string | null;
    productId: string | null;
    baseSize: string | null;
    sizeRange: string | null;
    gradingRule: string | null;
    productionMaterialCategory: ProductionMaterialCategory | null;
    sourceType: PatternSourceType | null;
    patternSupplierId: string | null;
    sourceSupplierCode: string | null;
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

  if (input.code !== undefined) {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new PatternValidationError("Mã rập không được để trống.");
    if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) {
      throw new PatternValidationError("Mã rập chỉ dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.");
    }
    data.code = code;
  }

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
  if (input.patternSupplierId !== undefined) data.patternSupplierId = input.patternSupplierId;
  if (input.sourceSupplierCode !== undefined) {
    data.sourceSupplierCode = input.sourceSupplierCode?.trim() || null;
  }
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
    const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(",") : String(err.meta?.target ?? "");
    if (target.toLowerCase().includes("code")) {
      return new PatternValidationError("Mã rập đã tồn tại.", { code: "Mã rập đã tồn tại." }, "CONFLICT");
    }
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
    code: string;
    name: string;
    version: number;
    productCategoryId: string | null;
    productId: string | null;
    baseSize: string | null;
    sizeRange: string | null;
    gradingRule: string | null;
    productionMaterialCategory: ProductionMaterialCategory | null;
    sourceType: PatternSourceType | null;
    patternSupplierId: string | null;
    sourceSupplierCode: string | null;
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

  const requestedKeys = Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  const onlyCodeChange = requestedKeys.length > 0 && requestedKeys.every((key) => key === "code");

  if (existing.status !== PatternStatus.DRAFT && !onlyCodeChange) {
    throw new PatternValidationError(
      existing.status === PatternStatus.ARCHIVED
        ? "Rập đã lưu trữ, chỉ được phép sửa mã rập."
        : "Rập đã duyệt được khóa; chỉ được phép sửa mã rập. Hãy tạo phiên bản mới để sửa nội dung kỹ thuật.",
      undefined,
      "CONFLICT",
    );
  }
  if (input.version !== undefined && input.version !== existing.version) {
    throw new PatternValidationError(
      "Version rập do hệ thống quản lý. Hãy dùng chức năng tạo phiên bản mới.",
      { version: "Không thể sửa version trực tiếp." },
      "CONFLICT",
    );
  }

  let supplierSnapshots: Awaited<ReturnType<typeof resolvePatternSupplierSnapshots>> | null = null;
  if (input.patternSupplierId !== undefined) {
    try {
      supplierSnapshots = await resolvePatternSupplierSnapshots(input.patternSupplierId);
    } catch {
      throw new PatternValidationError("Nhà cung cấp rập không hợp lệ.");
    }
  }

  const metadataInput = supplierSnapshots
    ? {
        ...input,
        patternSupplierId: supplierSnapshots.patternSupplierId,
        sourceSupplierCode: supplierSnapshots.sourceSupplierCode,
        sourceSupplier: supplierSnapshots.sourceSupplier,
        sourceSupplierContact: supplierSnapshots.sourceSupplierContact,
        sourcePhone: supplierSnapshots.sourcePhone,
        sourceEmail: supplierSnapshots.sourceEmail,
      }
    : input;

  const metadataPatch = buildPatternUpdateData(metadataInput);
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


export async function setAllPatternStatuses(
  status: PatternStatus,
  changedBy?: string | null,
): Promise<{ updated: number }> {
  const now = new Date();
  const data: Prisma.PatternUpdateManyMutationInput =
    status === PatternStatus.APPROVED
      ? {
          status,
          approvedAt: now,
          approvedBy: changedBy?.trim() || null,
        }
      : status === PatternStatus.DRAFT
        ? {
            status,
            approvedAt: null,
            approvedBy: null,
          }
        : {
            status,
          };

  const result = await prisma.pattern.updateMany({ data });
  return { updated: result.count };
}

export async function deletePattern(id: string): Promise<{
  ok: true;
  storageWarnings: string[];
}> {
  const pattern = await prisma.pattern.findUnique({
    where: { id },
    include: {
      files: { select: { r2ObjectKey: true, cloudinaryPublicId: true } },
      _count: { select: { techPacks: true } },
    },
  });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.", undefined, "NOT_FOUND");
  if (pattern._count.techPacks > 0) {
    throw new PatternValidationError(
      "Rập đã được liên kết Tech Pack nên không thể xóa. Hãy lưu trữ rập để giữ lịch sử sản xuất.",
      undefined,
      "CONFLICT",
    );
  }
  if (pattern.status === PatternStatus.APPROVED) {
    throw new PatternValidationError(
      "Rập đã duyệt không thể xóa trực tiếp. Hãy lưu trữ rập trước.",
      undefined,
      "CONFLICT",
    );
  }

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
  if (pattern.status === PatternStatus.APPROVED) {
    throw new PatternValidationError("Rập đã duyệt được khóa. Hãy tạo phiên bản mới trước khi thêm file.");
  }

  const normalizedTitle = input.title?.trim() || null;
  if (normalizedTitle === "__PATTERN_COVER__") {
    return prisma.$transaction(async (tx) => {
      await tx.patternFile.updateMany({
        where: { patternId, title: "__PATTERN_COVER__" },
        data: { title: null },
      });
      return tx.patternFile.create({
        data: {
          patternId,
          type: input.type,
          title: normalizedTitle,
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
    });
  }

  return prisma.patternFile.create({
    data: {
      patternId,
      type: input.type,
      title: normalizedTitle,
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
  const file = await prisma.patternFile.findFirst({
    where: { id: fileId, patternId },
    include: { pattern: { select: { status: true } } },
  });
  if (!file) throw new PatternValidationError("Không tìm thấy file.");
  if (file.pattern.status !== PatternStatus.DRAFT) {
    throw new PatternValidationError("Chỉ rập bản nháp mới được chỉnh sửa file.");
  }

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
  const file = await prisma.patternFile.findFirst({
    where: { id: fileId, patternId },
    include: { pattern: { select: { status: true } } },
  });
  if (!file) throw new PatternValidationError("Không tìm thấy file.");
  if (file.pattern.status !== PatternStatus.DRAFT) {
    throw new PatternValidationError("Chỉ rập bản nháp mới được xóa file.");
  }
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
