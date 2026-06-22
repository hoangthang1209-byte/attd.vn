import { prisma } from "@/lib/prisma";

export async function generateMaterialCode(): Promise<string> {
  const count = await prisma.material.count();
  return `VT-${String(count + 1).padStart(6, "0")}`;
}

export async function generatePurchaseRequestCode(): Promise<string> {
  const count = await prisma.purchaseRequest.count();
  return `YC-${String(count + 1).padStart(6, "0")}`;
}

export async function generateMaterialSupplierCode(): Promise<string> {
  const rows = await prisma.materialSupplier.findMany({ select: { supplierCode: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.supplierCode.match(/^NCC-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `NCC-${String(max + 1).padStart(6, "0")}`;
}
