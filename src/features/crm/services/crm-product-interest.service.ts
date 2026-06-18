import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapProductInterestRow } from "@/features/crm/mappers";
import type { CreateProductInterestInput, CrmProductInterestRecord } from "@/features/crm/types";

export async function createCRMProductInterest(
  input: CreateProductInterestInput & { leadId?: string | null; customerId?: string | null }
): Promise<CrmProductInterestRecord | null> {
  if (!input.leadId && !input.customerId) {
    return null;
  }

  let productNameSnapshot = input.productNameSnapshot?.trim() || null;

  if (input.productId && !productNameSnapshot) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { name: true },
    });
    productNameSnapshot = product?.name ?? null;
  }

  try {
    const row = await prisma.cRMProductInterest.create({
      data: {
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        productId: input.productId ?? null,
        variantId: input.variantId ?? null,
        productNameSnapshot,
        quantity: input.quantity ?? null,
        unit: input.unit?.trim() || "cái",
        requirementNote: input.requirementNote?.trim() || null,
        serviceNeeds: input.serviceNeeds
          ? (input.serviceNeeds as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    return mapProductInterestRow(row);
  } catch (err) {
    console.error("[CRM] createCRMProductInterest failed:", err);
    return null;
  }
}
