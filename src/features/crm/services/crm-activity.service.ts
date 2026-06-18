import type { CRMActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapActivityRow } from "@/features/crm/mappers";
import type { CrmActivityRecord } from "@/features/crm/types";

export type CreateCRMActivityInput = {
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  type?: CRMActivityType;
  title: string;
  content?: string | null;
  outcome?: string | null;
  nextFollowUpAt?: Date | null;
  createdBy?: string | null;
};

export async function createCRMActivity(
  input: CreateCRMActivityInput
): Promise<CrmActivityRecord | null> {
  const title = input.title.trim();
  if (!title) return null;

  if (!input.leadId && !input.customerId) {
    return null;
  }

  try {
    const row = await prisma.cRMActivity.create({
      data: {
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        contactId: input.contactId ?? null,
        type: input.type ?? "NOTE",
        title,
        content: input.content?.trim() || null,
        outcome: input.outcome?.trim() || null,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        createdBy: input.createdBy ?? null,
      },
    });
    return mapActivityRow(row);
  } catch (err) {
    console.error("[CRM] createCRMActivity failed:", err);
    return null;
  }
}

export async function listRecentActivities(limit = 10): Promise<CrmActivityRecord[]> {
  try {
    const rows = await prisma.cRMActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapActivityRow);
  } catch {
    return [];
  }
}
