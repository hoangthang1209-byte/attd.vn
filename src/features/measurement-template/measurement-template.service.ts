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
    items: Array<{
      pointOfMeasure: string;
      description?: string | null;
      tolerance?: string | null;
      sortOrder?: number;
      values?: Array<{ size: string; value: string }>;
    }>;
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
      await tx.measurementTemplateValue.deleteMany({
        where: { measurement: { templateId: id } },
      });
      await tx.measurementTemplateItem.deleteMany({ where: { templateId: id } });

      for (const [index, row] of input.items.entries()) {
        const pom = row.pointOfMeasure?.trim();
        if (!pom) continue;
        const measurement = await tx.measurementTemplateItem.create({
          data: {
            templateId: id,
            pointOfMeasure: pom,
            description: row.description?.trim() || null,
            tolerance: row.tolerance?.trim() || null,
            sortOrder: row.sortOrder ?? index,
          },
        });
        for (const val of row.values ?? []) {
          if (!val.size?.trim() || !val.value?.trim()) continue;
          await tx.measurementTemplateValue.create({
            data: {
              measurementId: measurement.id,
              size: val.size.trim(),
              value: val.value.trim(),
            },
          });
        }
      }
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
    await tx.techPackMeasurementValue.deleteMany({
      where: { measurement: { techPackId: target.techPackId } },
    });
    await tx.techPackMeasurement.deleteMany({ where: { techPackId: target.techPackId } });
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
    await tx.patternMeasurementValue.deleteMany({
      where: { measurement: { patternId: target.patternId } },
    });
    await tx.patternMeasurement.deleteMany({ where: { patternId: target.patternId } });
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
    await tx.patternMeasurementValue.deleteMany({
      where: { measurement: { patternId } },
    });
    await tx.patternMeasurement.deleteMany({ where: { patternId } });
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
