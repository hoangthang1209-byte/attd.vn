import { prisma } from "@/lib/prisma";
import type { BomItemInput } from "@/features/tech-pack/tech-pack-bom.service";

/** Resolve master references into snapshot text fields for BOM rows. */
export async function resolveBomItemSnapshots(rows: BomItemInput[]): Promise<BomItemInput[]> {
  const materialIds = rows.map((r) => r.materialId).filter(Boolean) as string[];
  const trimIds = rows.map((r) => r.trimId).filter(Boolean) as string[];
  const supplierIds = rows.map((r) => r.supplierId).filter(Boolean) as string[];

  const [materials, trims, suppliers] = await Promise.all([
    materialIds.length
      ? prisma.productionMaterial.findMany({
          where: { id: { in: materialIds } },
          include: { supplier: { select: { name: true } } },
        })
      : [],
    trimIds.length ? prisma.productionTrim.findMany({ where: { id: { in: trimIds } } }) : [],
    supplierIds.length ? prisma.productionSupplier.findMany({ where: { id: { in: supplierIds } } }) : [],
  ]);

  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const trimMap = new Map(trims.map((t) => [t.id, t]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  return rows.map((row) => {
    const next = { ...row };
    if (row.materialId) {
      const m = materialMap.get(row.materialId);
      if (m) {
        if (!next.itemName?.trim()) next.itemName = m.name;
        if (!next.specification?.trim()) {
          const parts = [m.composition, m.gsm ? `${m.gsm} GSM` : null, m.width ? `Rộng ${m.width}` : null].filter(Boolean);
          next.specification = parts.join(" · ") || next.specification;
        }
        if (!next.color?.trim() && m.defaultColor) next.color = m.defaultColor;
        if (!next.supplier?.trim()) next.supplier = m.supplier?.name ?? next.supplier;
      }
    }
    if (row.trimId) {
      const t = trimMap.get(row.trimId);
      if (t && !next.itemName?.trim()) next.itemName = t.name;
    }
    if (row.supplierId) {
      const s = supplierMap.get(row.supplierId);
      if (s) next.supplier = s.name;
    }
    return next;
  });
}

export async function resolvePrintMethodSnapshot(printMethodId: string | null | undefined, fallback: string | null) {
  if (!printMethodId) return fallback;
  const pm = await prisma.printMethod.findUnique({ where: { id: printMethodId } });
  if (!pm) return fallback;
  return pm.name;
}
