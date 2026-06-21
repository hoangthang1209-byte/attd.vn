import { Prisma } from "@prisma/client";

export function formatMaterialQuantityDisplay(value: string, unit: string): string {
  const decimal = new Prisma.Decimal(value);
  const normalizedUnit = unit.trim().toLowerCase();
  const pieceUnits = new Set(["cái", "cai", "pcs", "pc", "chiếc", "chiec"]);

  if (pieceUnits.has(normalizedUnit)) {
    const asInt = decimal.toFixed(0);
    if (decimal.equals(new Prisma.Decimal(asInt))) {
      return asInt;
    }
  }

  const fixed = decimal.toFixed(3);
  return fixed.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}
