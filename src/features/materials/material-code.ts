import { prisma } from "@/lib/prisma";

export async function generateMaterialCode(): Promise<string> {
  const count = await prisma.material.count();
  return `VT-${String(count + 1).padStart(6, "0")}`;
}

export async function generatePurchaseRequestCode(): Promise<string> {
  const count = await prisma.purchaseRequest.count();
  return `YC-${String(count + 1).padStart(6, "0")}`;
}
