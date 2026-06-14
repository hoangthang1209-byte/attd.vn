import { Prisma, type LeadSource, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUSES,
  type CreateCrmLeadInput,
  type CrmLeadKpis,
  type CrmLeadNoteRecord,
  type CrmLeadRecord,
  type CrmLeadReminders,
} from "@/features/crm/types";

function mapLeadRow(row: {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  message: string | null;
  followUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  notes?: { id: string; leadId: string; content: string; createdAt: Date }[];
}): CrmLeadRecord {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    company: row.company,
    source: row.source,
    status: row.status,
    message: row.message,
    followUpAt: row.followUpAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes?.map(
      (note): CrmLeadNoteRecord => ({
        id: note.id,
        leadId: note.leadId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      })
    ),
  };
}

export async function isCrmLeadTableReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Lead" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function createCrmLead(input: CreateCrmLeadInput): Promise<CrmLeadRecord | null> {
  try {
    if (!(await isCrmLeadTableReady())) return null;

    const row = await prisma.lead.create({
      data: {
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        company: input.company?.trim() || null,
        source: input.source,
        message: input.message?.trim() || null,
        status: input.status ?? "NEW",
        followUpAt: input.followUpAt ?? null,
      },
    });

    return mapLeadRow(row);
  } catch (err) {
    console.error("[CRM] createCrmLead failed:", err);
    return null;
  }
}

export type ListCrmLeadsParams = {
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
  limit?: number;
};

export async function listCrmLeads(params: ListCrmLeadsParams = {}): Promise<{
  leads: CrmLeadRecord[];
  total: number;
  kpis: CrmLeadKpis;
  reminders: CrmLeadReminders;
}> {
  const emptyKpis = Object.fromEntries(
    CRM_LEAD_STATUSES.map((status) => [status, 0])
  ) as CrmLeadKpis;

  if (!(await isCrmLeadTableReady())) {
    return {
      leads: [],
      total: 0,
      kpis: emptyKpis,
      reminders: { dueToday: 0, overdue: 0 },
    };
  }

  const where: Prisma.LeadWhereInput = {};
  const search = params.search?.trim();
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.source) where.source = params.source;
  if (params.status) where.status = params.status;

  const limit = Math.min(200, Math.max(1, params.limit ?? 100));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [rows, total, statusGroups, dueToday, overdue] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: {
        followUpAt: { gte: startOfToday, lt: endOfToday },
        status: { notIn: ["WON", "LOST"] },
      },
    }),
    prisma.lead.count({
      where: {
        followUpAt: { lt: startOfToday },
        status: { notIn: ["WON", "LOST"] },
      },
    }),
  ]);

  const kpis = { ...emptyKpis };
  for (const group of statusGroups) {
    kpis[group.status] = group._count._all;
  }

  return {
    leads: rows.map(mapLeadRow),
    total,
    kpis,
    reminders: { dueToday, overdue },
  };
}

export async function getCrmLeadById(id: string): Promise<CrmLeadRecord | null> {
  if (!(await isCrmLeadTableReady())) return null;

  const row = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  return row ? mapLeadRow(row) : null;
}

export async function updateCrmLead(
  id: string,
  data: {
    status?: LeadStatus;
    followUpAt?: Date | null;
  }
): Promise<CrmLeadRecord | null> {
  if (!(await isCrmLeadTableReady())) return null;

  try {
    const row = await prisma.lead.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.followUpAt !== undefined ? { followUpAt: data.followUpAt } : {}),
      },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
      },
    });
    return mapLeadRow(row);
  } catch {
    return null;
  }
}

export async function addCrmLeadNote(
  leadId: string,
  content: string
): Promise<CrmLeadNoteRecord | null> {
  if (!(await isCrmLeadTableReady())) return null;

  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    const note = await prisma.leadNote.create({
      data: { leadId, content: trimmed },
    });
    return {
      id: note.id,
      leadId: note.leadId,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export function isValidLeadStatus(value: string): value is LeadStatus {
  return CRM_LEAD_STATUSES.includes(value as LeadStatus);
}

export function isValidLeadSource(value: string): value is LeadSource {
  return CRM_LEAD_SOURCES.includes(value as LeadSource);
}
