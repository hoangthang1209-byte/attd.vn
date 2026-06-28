import { prisma } from "@/lib/prisma";

export class ProductionMasterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionMasterValidationError";
  }
}

type MasterTable = "productionMaterial" | "productionTrim" | "productionSupplier" | "printMethod";

async function listCodes(table: MasterTable): Promise<string[]> {
  switch (table) {
    case "productionMaterial":
      return (await prisma.productionMaterial.findMany({ select: { code: true } })).map((r) => r.code);
    case "productionTrim":
      return (await prisma.productionTrim.findMany({ select: { code: true } })).map((r) => r.code);
    case "productionSupplier":
      return (await prisma.productionSupplier.findMany({ select: { code: true } })).map((r) => r.code);
    case "printMethod":
      return (await prisma.printMethod.findMany({ select: { code: true } })).map((r) => r.code);
  }
}

export async function generateMasterCode(prefix: string, table: MasterTable): Promise<string> {
  const rows = await listCodes(table);
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const code of rows) {
    const match = code.match(re);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}
