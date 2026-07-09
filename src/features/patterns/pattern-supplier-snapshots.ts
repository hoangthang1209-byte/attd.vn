import { SupplierCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SUPPLIER_CATEGORY_VALUES = new Set<string>(Object.values(SupplierCategory));

export function parseSupplierCategory(value: unknown): SupplierCategory | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !SUPPLIER_CATEGORY_VALUES.has(value)) {
    return undefined;
  }
  return value as SupplierCategory;
}

export async function resolvePatternSupplierSnapshots(patternSupplierId: string | null) {
  if (!patternSupplierId) {
    return {
      patternSupplierId: null,
      sourceSupplierCode: null,
      sourceSupplier: null,
      sourceSupplierContact: null,
      sourcePhone: null,
      sourceEmail: null,
    };
  }

  const supplier = await prisma.productionSupplier.findUnique({
    where: { id: patternSupplierId },
    select: {
      id: true,
      code: true,
      name: true,
      contact: true,
      phone: true,
      email: true,
      isActive: true,
    },
  });

  if (!supplier) {
    throw new Error("SUPPLIER_NOT_FOUND");
  }

  return {
    patternSupplierId: supplier.id,
    sourceSupplierCode: supplier.code,
    sourceSupplier: supplier.name,
    sourceSupplierContact: supplier.contact,
    sourcePhone: supplier.phone,
    sourceEmail: supplier.email,
  };
}
