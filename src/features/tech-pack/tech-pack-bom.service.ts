import { TechPackBomCategory, TechPackStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";

export type BomItemInput = {
  id?: string;
  sortOrder?: number;
  category?: TechPackBomCategory;
  itemName: string;
  specification?: string | null;
  color?: string | null;
  supplier?: string | null;
  unit?: string | null;
  consumption?: string | null;
  wastePercent?: string | null;
  notes?: string | null;
  materialId?: string | null;
  trimId?: string | null;
  supplierId?: string | null;
};

async function assertDraftPack(techPackId: string) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  if (pack.status !== TechPackStatus.DRAFT) {
    throw new TechPackValidationError("Chỉ Tech Pack bản nháp mới có thể chỉnh sửa.");
  }
}

const BOM_INCLUDE = {
  material: { select: { id: true, code: true, name: true } },
  trim: { select: { id: true, code: true, name: true } },
  supplierRef: { select: { id: true, code: true, name: true } },
} as const;

export async function replaceTechPackBomItems(techPackId: string, items: BomItemInput[]) {
  await assertDraftPack(techPackId);

  const { resolveBomItemSnapshots } = await import("@/features/production-master/bom-snapshot");
  const resolved = await resolveBomItemSnapshots(items);

  return prisma.$transaction(async (tx) => {
    await tx.techPackBomItem.deleteMany({ where: { techPackId } });
    for (const [index, row] of resolved.entries()) {
      const name = row.itemName?.trim();
      if (!name) continue;
      await tx.techPackBomItem.create({
        data: {
          techPackId,
          sortOrder: row.sortOrder ?? index,
          category: row.category ?? TechPackBomCategory.OTHER,
          itemName: name,
          specification: row.specification?.trim() || null,
          color: row.color?.trim() || null,
          supplier: row.supplier?.trim() || null,
          unit: row.unit?.trim() || null,
          consumption: row.consumption?.trim() || null,
          wastePercent: row.wastePercent?.trim() || null,
          notes: row.notes?.trim() || null,
          materialId: row.materialId || null,
          trimId: row.trimId || null,
          supplierId: row.supplierId || null,
        },
      });
    }
    return tx.techPackBomItem.findMany({
      where: { techPackId },
      orderBy: { sortOrder: "asc" },
      include: BOM_INCLUDE,
    });
  });
}

export async function listTechPackBomItems(techPackId: string) {
  return prisma.techPackBomItem.findMany({
    where: { techPackId },
    orderBy: { sortOrder: "asc" },
    include: BOM_INCLUDE,
  });
}
