import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMeasurementTemplateCode } from "@/features/measurement-template/measurement-template-code";
import { TechPackReleaseAction } from "@prisma/client";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import { logTechPackReleaseEvent } from "@/features/tech-pack/tech-pack-release.service";
import { PatternValidationError } from "@/features/patterns/pattern.service";

const TEMPLATE_INCLUDE = {
  productCategory: { select: { id: true, name: true } },
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { size: "asc" as const } } },
  },
} satisfies Prisma.MeasurementTemplateInclude;

export type MeasurementTemplateDetail = Prisma.MeasurementTemplateGetPayload<{
  include: typeof TEMPLATE_INCLUDE;
}>;

export class MeasurementTemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeasurementTemplateValidationError";
  }
}

type MeasurementTemplateItemInput = {
  pointOfMeasure: string;
  description?: string | null;
  tolerance?: string | null;
  sortOrder?: number;
  values?: Array<{ size: string; value: string }>;
};

async function replaceMeasurementTemplateItems(
  tx: Prisma.TransactionClient,
  templateId: string,
  items: MeasurementTemplateItemInput[],
) {
  const existingItems = await tx.measurementTemplateItem.findMany({
    where: { templateId },
    select: { id: true },
  });
  const existingItemIds = existingItems.map((item) => item.id);

  if (existingItemIds.length > 0) {
    await tx.measurementTemplateValue.deleteMany({
      where: { measurementId: { in: existingItemIds } },
    });
    await tx.measurementTemplateItem.deleteMany({ where: { id: { in: existingItemIds } } });
  }

  for (const [index, row] of items.entries()) {
    const pom = row.pointOfMeasure?.trim();
    if (!pom) continue;
    const measurement = await tx.measurementTemplateItem.create({
      data: {
        templateId,
        pointOfMeasure: pom,
        description: row.description?.trim() || null,
        tolerance: row.tolerance?.trim() || null,
        sortOrder: row.sortOrder ?? index,
      },
    });

    const seenSizes = new Set<string>();
    for (const val of row.values ?? []) {
      const size = val.size?.trim();
      const value = val.value?.trim();
      if (!size || !value || seenSizes.has(size)) continue;
      seenSizes.add(size);
      await tx.measurementTemplateValue.create({
        data: {
          measurementId: measurement.id,
          size,
          value,
        },
      });
    }
  }
}

async function deleteTechPackMeasurements(tx: Prisma.TransactionClient, techPackId: string) {
  const existingMeasurements = await tx.techPackMeasurement.findMany({
    where: { techPackId },
    select: { id: true },
  });
  const existingMeasurementIds = existingMeasurements.map((measurement) => measurement.id);
  if (existingMeasurementIds.length === 0) return;

  await tx.techPackMeasurementValue.deleteMany({
    where: { measurementId: { in: existingMeasurementIds } },
  });
  await tx.techPackMeasurement.deleteMany({ where: { id: { in: existingMeasurementIds } } });
}

async function deletePatternMeasurements(tx: Prisma.TransactionClient, patternId: string) {
  const existingMeasurements = await tx.patternMeasurement.findMany({
    where: { patternId },
    select: { id: true },
  });
  const existingMeasurementIds = existingMeasurements.map((measurement) => measurement.id);
  if (existingMeasurementIds.length === 0) return;

  await tx.patternMeasurementValue.deleteMany({
    where: { measurementId: { in: existingMeasurementIds } },
  });
  await tx.patternMeasurement.deleteMany({ where: { id: { in: existingMeasurementIds } } });
}

export async function listMeasurementTemplates(input?: {
  search?: string;
  productCategoryId?: string;
  limit?: number;
}) {
  const where: Prisma.MeasurementTemplateWhereInput = {};
  if (input?.productCategoryId) where.productCategoryId = input.productCategoryId;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.measurementTemplate.findMany({
    where,
    include: { productCategory: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    orderBy: { updatedAt: "desc" },
    take: input?.limit ?? 100,
  });
  return { items };
}

export async function getMeasurementTemplateDetail(id: string) {
  return prisma.measurementTemplate.findUnique({ where: { id }, include: TEMPLATE_INCLUDE });
}

export async function createMeasurementTemplate(input: {
  name: string;
  productCategoryId?: string | null;
  baseSize?: string | null;
  notes?: string | null;
}) {
  const name = input.name?.trim();
  if (!name) throw new MeasurementTemplateValidationError("Tên mẫu thông số là bắt buộc.");
  const code = await generateMeasurementTemplateCode();
  return prisma.measurementTemplate.create({
    data: {
      code,
      name,
      productCategoryId: input.productCategoryId || null,
      baseSize: input.baseSize?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    include: TEMPLATE_INCLUDE,
  });
}

export async function updateMeasurementTemplate(
  id: string,
  input: Partial<{
    name: string;
    productCategoryId: string | null;
    baseSize: string | null;
    notes: string | null;
    items: MeasurementTemplateItemInput[];
  }>,
) {
  const existing = await prisma.measurementTemplate.findUnique({ where: { id } });
  if (!existing) throw new MeasurementTemplateValidationError("Không tìm thấy mẫu thông số.");

  return prisma.$transaction(async (tx) => {
    await tx.measurementTemplate.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? undefined,
        productCategoryId: input.productCategoryId,
        baseSize: input.baseSize,
        notes: input.notes,
      },
    });

    if (input.items) {
      await replaceMeasurementTemplateItems(tx, id, input.items);
    }

    return tx.measurementTemplate.findUniqueOrThrow({ where: { id }, include: TEMPLATE_INCLUDE });
  });
}

export async function duplicateMeasurementTemplate(id: string) {
  const source = await prisma.measurementTemplate.findUnique({
    where: { id },
    include: { items: { include: { values: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!source) throw new MeasurementTemplateValidationError("Không tìm thấy mẫu thông số.");
  const code = await generateMeasurementTemplateCode();

  return prisma.$transaction(async (tx) => {
    const created = await tx.measurementTemplate.create({
      data: {
        code,
        name: `${source.name} (bản sao)`,
        productCategoryId: source.productCategoryId,
        baseSize: source.baseSize,
        notes: source.notes,
      },
    });
    for (const row of source.items) {
      const measurement = await tx.measurementTemplateItem.create({
        data: {
          templateId: created.id,
          pointOfMeasure: row.pointOfMeasure,
          description: row.description,
          tolerance: row.tolerance,
          sortOrder: row.sortOrder,
        },
      });
      for (const val of row.values) {
        await tx.measurementTemplateValue.create({
          data: { measurementId: measurement.id, size: val.size, value: val.value },
        });
      }
    }
    return tx.measurementTemplate.findUniqueOrThrow({
      where: { id: created.id },
      include: TEMPLATE_INCLUDE,
    });
  });
}

async function copyTemplateItemsToMeasurements(
  tx: Prisma.TransactionClient,
  templateId: string,
  target: { techPackId?: string; patternId?: string },
) {
  const template = await tx.measurementTemplate.findUnique({
    where: { id: templateId },
    include: { items: { include: { values: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new MeasurementTemplateValidationError("Không tìm thấy mẫu thông số.");

  if (target.techPackId) {
    await deleteTechPackMeasurements(tx, target.techPackId);
    for (const [index, row] of template.items.entries()) {
      const measurement = await tx.techPackMeasurement.create({
        data: {
          techPackId: target.techPackId,
          pointOfMeasure: row.pointOfMeasure,
          description: row.description,
          baseSize: template.baseSize,
          tolerance: row.tolerance,
          sortOrder: row.sortOrder ?? index,
        },
      });
      for (const val of row.values) {
        await tx.techPackMeasurementValue.create({
          data: { measurementId: measurement.id, size: val.size, value: val.value },
        });
      }
    }
  }

  if (target.patternId) {
    await deletePatternMeasurements(tx, target.patternId);
    for (const [index, row] of template.items.entries()) {
      const measurement = await tx.patternMeasurement.create({
        data: {
          patternId: target.patternId,
          pointOfMeasure: row.pointOfMeasure,
          description: row.description,
          baseSize: template.baseSize,
          tolerance: row.tolerance,
          sortOrder: row.sortOrder ?? index,
        },
      });
      for (const val of row.values) {
        await tx.patternMeasurementValue.create({
          data: { measurementId: measurement.id, size: val.size, value: val.value },
        });
      }
    }
  }
}

export async function applyMeasurementTemplateToTechPack(
  techPackId: string,
  templateId: string,
  actor?: { id?: string | null; name?: string | null },
) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  if (pack.status !== "DRAFT") throw new TechPackValidationError("Chỉ Tech Pack bản nháp mới có thể chỉnh sửa.");

  await prisma.$transaction(async (tx) => {
    await copyTemplateItemsToMeasurements(tx, templateId, { techPackId });
  });

  await logTechPackReleaseEvent({
    techPackId,
    version: pack.version,
    action: TechPackReleaseAction.COPY_TEMPLATE,
    actorId: actor?.id,
    actorName: actor?.name,
    snapshotJson: { templateId },
  });

  return getMeasurementTemplateDetail(templateId);
}

export async function applyMeasurementTemplateToPattern(patternId: string, templateId: string) {
  const pattern = await prisma.pattern.findUnique({ where: { id: patternId } });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.");
  if (pattern.status === "ARCHIVED") throw new PatternValidationError("Rập đã lưu trữ, không thể chỉnh sửa.");

  await prisma.$transaction(async (tx) => {
    await copyTemplateItemsToMeasurements(tx, templateId, { patternId });
  });

  return getMeasurementTemplateDetail(templateId);
}

export async function copyTechPackMeasurementsToPattern(patternId: string, techPackId: string) {
  const pattern = await prisma.pattern.findUnique({ where: { id: patternId } });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.");
  if (pattern.status === "ARCHIVED") throw new PatternValidationError("Rập đã lưu trữ, không thể chỉnh sửa.");

  const pack = await prisma.techPack.findUnique({
    where: { id: techPackId },
    include: { measurements: { include: { values: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");

  return prisma.$transaction(async (tx) => {
    await deletePatternMeasurements(tx, patternId);
    for (const [index, row] of pack.measurements.entries()) {
      const measurement = await tx.patternMeasurement.create({
        data: {
          patternId,
          pointOfMeasure: row.pointOfMeasure,
          description: row.description,
          baseSize: row.baseSize,
          tolerance: row.tolerance,
          sortOrder: row.sortOrder ?? index,
        },
      });
      for (const val of row.values) {
        await tx.patternMeasurementValue.create({
          data: { measurementId: measurement.id, size: val.size, value: val.value },
        });
      }
    }
    return tx.pattern.findUniqueOrThrow({
      where: { id: patternId },
      include: {
        measurements: { include: { values: true }, orderBy: { sortOrder: "asc" } },
      },
    });
  });
}
