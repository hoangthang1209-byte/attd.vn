import { Prisma } from "@prisma/client";

export function computeRequiredQuantity(
  totalQuantity: number,
  consumptionPerUnit: Prisma.Decimal | number | string,
  wastagePercent: Prisma.Decimal | number | string,
): Prisma.Decimal {
  const qty = new Prisma.Decimal(totalQuantity);
  const consumption = new Prisma.Decimal(consumptionPerUnit);
  const wastage = new Prisma.Decimal(wastagePercent);
  const base = qty.mul(consumption);
  const factor = new Prisma.Decimal(1).add(wastage.div(100));
  return base.mul(factor);
}

export function formatRequiredQuantityFormula(
  totalQuantity: number,
  consumptionPerUnit: Prisma.Decimal | number | string,
  wastagePercent: Prisma.Decimal | number | string,
  unit: string,
  result?: Prisma.Decimal | number | string,
): string {
  const consumption = new Prisma.Decimal(consumptionPerUnit);
  const wastage = new Prisma.Decimal(wastagePercent);
  const computed = result ?? computeRequiredQuantity(totalQuantity, consumption, wastage);
  const wastagePart = wastage.gt(0) ? ` + ${wastage.toFixed()}% hao hụt` : "";
  return `${totalQuantity} × ${consumption.toFixed()} ${unit}${wastagePart} = ${new Prisma.Decimal(computed).toFixed()} ${unit}`;
}

export function decimalToDisplay(value: Prisma.Decimal | number | string): string {
  return new Prisma.Decimal(value).toFixed();
}

export function normalizeMaterialKey(input: {
  materialCode: string | null | undefined;
  materialName: string;
  unit: string;
}): string {
  const code = input.materialCode?.trim();
  if (code) return `code:${code.toLowerCase()}`;
  const name = input.materialName.trim().toLowerCase().replace(/\s+/g, " ");
  const unit = input.unit.trim().toLowerCase();
  return `name:${name}|unit:${unit}`;
}

export type AggregatedMaterialRow = {
  materialType: string;
  materialName: string;
  materialCode: string | null;
  unit: string;
  totalRequiredQuantity: string;
  notes: string[];
};

export function aggregateOrderMaterials(
  rows: Array<{
    materialType: string;
    materialName: string;
    materialCode: string | null;
    unit: string;
    requiredQuantity: Prisma.Decimal | number | string;
    note: string | null;
  }>,
): AggregatedMaterialRow[] {
  const map = new Map<string, AggregatedMaterialRow & { total: Prisma.Decimal }>();

  for (const row of rows) {
    const key = normalizeMaterialKey(row);
    const existing = map.get(key);
    const qty = new Prisma.Decimal(row.requiredQuantity);
    if (existing) {
      existing.total = existing.total.add(qty);
      if (row.note?.trim()) existing.notes.push(row.note.trim());
    } else {
      map.set(key, {
        materialType: row.materialType,
        materialName: row.materialName,
        materialCode: row.materialCode,
        unit: row.unit,
        totalRequiredQuantity: "0",
        notes: row.note?.trim() ? [row.note.trim()] : [],
        total: qty,
      });
    }
  }

  return Array.from(map.values())
    .map(({ total, notes, ...rest }) => ({
      ...rest,
      totalRequiredQuantity: total.toFixed(),
      notes: [...new Set(notes)],
    }))
    .sort((a, b) => a.materialName.localeCompare(b.materialName, "vi"));
}

export function resolveOrderItemTotalQuantity(item: {
  quantity: number;
  variants?: Array<{ quantity: number }>;
}): number {
  if (item.variants?.length) {
    return item.variants.reduce((sum, v) => sum + v.quantity, 0);
  }
  return item.quantity;
}
