import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapProductInterestRow } from "@/features/crm/mappers";
import { resolveProductInterestSnapshot } from "@/features/crm/services/crm-product-interest-snapshot";
import type { CreateProductInterestInput, CrmProductInterestRecord } from "@/features/crm/types";

export async function createCRMProductInterest(
  input: CreateProductInterestInput & { leadId?: string | null; customerId?: string | null }
): Promise<CrmProductInterestRecord | null> {
  if (!input.leadId && !input.customerId) {
    return null;
  }

  const productNameSnapshot = await resolveProductInterestSnapshot(input);

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

export async function createCRMProductInterests(
  inputs: Array<
    CreateProductInterestInput & { leadId?: string | null; customerId?: string | null }
  >
): Promise<void> {
  for (const input of inputs) {
    await createCRMProductInterest(input);
  }
}
