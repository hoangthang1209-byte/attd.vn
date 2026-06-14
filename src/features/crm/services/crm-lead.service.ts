import { Prisma, type LeadPipelineStatus, type LeadSource, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapFormSourceToCrmSource } from "@/features/crm/labels";
import {
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUSES,
  type CreateCrmLeadInput,
  type CrmLeadKpis,
  type CrmLeadNoteRecord,
  type CrmLeadRecord,
  type CrmLeadReminders,
  type CrmLeadValueKpis,
  type ListCrmLeadsResult,
} from "@/features/crm/types";

function emptyValueKpis(): CrmLeadValueKpis {
  return { pipelineTotal: null, wonTotal: null };
}

function emptyReminders(): CrmLeadReminders {
  return { dueToday: 0, overdue: 0, dueTodayLeads: [], overdueLeads: [] };
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

function mapPipelineStatusToLeadStatus(status: LeadPipelineStatus): LeadStatus {
  switch (status) {
    case "CONTACTED":
      return "CONTACTED";
    case "QUOTED":
      return "QUOTING";
    case "NEGOTIATING":
      return "NEGOTIATING";
    case "WON":
      return "WON";
    case "LOST":
      return "LOST";
    default:
      return "NEW";
  }
}

export async function getCrmDiagnostics(): Promise<{
  tableReady: boolean;
  leadCount: number;
  leadNoteCount: number;
  dealerLeadCount: number;
  migrationApplied: boolean;
  lastError: string | null;
}> {
  let tableReady = false;
  let leadCount = 0;
  let leadNoteCount = 0;
  let dealerLeadCount = 0;
  let migrationApplied = false;
  let lastError: string | null = null;

  try {
    const migration = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE migration_name = '0006_sprint245_crm' AND finished_at IS NOT NULL
      LIMIT 1
    `;
    migrationApplied = migration.length > 0;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Cannot read migrations";
  }

  try {
    await prisma.$queryRaw`SELECT 1 FROM "Lead" LIMIT 1`;
    tableReady = true;
    leadCount = await prisma.lead.count();
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Lead table unavailable";
  }

  try {
    leadNoteCount = await prisma.leadNote.count();
  } catch {
    // LeadNote may not exist pre-migration
  }

  try {
    dealerLeadCount = await prisma.dealerLead.count();
  } catch (err) {
    lastError = err instanceof Error ? err.message : "DealerLead table unavailable";
  }

  return {
    tableReady,
    leadCount,
    leadNoteCount,
    dealerLeadCount,
    migrationApplied,
    lastError,
  };
}

export async function syncDealerLeadsToCrm(): Promise<number> {
  if (!(await isCrmLeadTableReady())) return 0;

  const dealerLeads = await prisma.dealerLead.findMany({
    orderBy: { createdAt: "asc" },
  });

  let synced = 0;
  for (const dealerLead of dealerLeads) {
    const status = mapPipelineStatusToLeadStatus(dealerLead.pipelineStatus);
    const messageParts = [dealerLead.message?.trim()].filter(Boolean);
    if (dealerLead.city?.trim()) {
      messageParts.push(`Tỉnh/TP: ${dealerLead.city.trim()}`);
    }
    if (dealerLead.salesNote?.trim()) {
      messageParts.push(`Ghi chú sales: ${dealerLead.salesNote.trim()}`);
    }

    await prisma.lead.upsert({
      where: { id: dealerLead.id },
      create: {
        id: dealerLead.id,
        fullName: dealerLead.contactName,
        phone: dealerLead.phone,
        email: dealerLead.email,
        company: dealerLead.companyName,
        source: mapFormSourceToCrmSource(dealerLead.source),
        status,
        message: messageParts.length > 0 ? messageParts.join("\n") : null,
        followUpAt: dealerLead.contactedAt,
        estimatedValue: dealerLead.estimatedValue,
        landingPage: dealerLead.landingPage,
        utmSource: dealerLead.utmSource,
        utmMedium: dealerLead.utmMedium,
        utmCampaign: dealerLead.utmCampaign,
        referrer: dealerLead.referrer,
        createdAt: dealerLead.createdAt,
        updatedAt: dealerLead.updatedAt,
      },
      update: {
        landingPage: dealerLead.landingPage,
        utmSource: dealerLead.utmSource,
        utmMedium: dealerLead.utmMedium,
        utmCampaign: dealerLead.utmCampaign,
        referrer: dealerLead.referrer,
        estimatedValue: dealerLead.estimatedValue,
      },
    });

    if (dealerLead.salesNote?.trim()) {
      const existingNote = await prisma.leadNote.findFirst({
        where: {
          leadId: dealerLead.id,
          content: dealerLead.salesNote.trim(),
        },
      });
      if (!existingNote) {
        await prisma.leadNote.create({
          data: {
            leadId: dealerLead.id,
            content: dealerLead.salesNote.trim(),
            createdAt: dealerLead.updatedAt,
          },
        });
      }
    }

    synced += 1;
  }

  return synced;
}

export async function ensureCrmLeadsSynced(): Promise<void> {
  try {
    if (!(await isCrmLeadTableReady())) return;
    await syncDealerLeadsToCrm();
  } catch (err) {
    console.error("[CRM] ensureCrmLeadsSynced failed:", err);
  }
}

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
  estimatedValue?: Prisma.Decimal | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
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
    estimatedValue: decimalToString(row.estimatedValue),
    landingPage: row.landingPage ?? null,
    utmSource: row.utmSource ?? null,
    utmMedium: row.utmMedium ?? null,
    utmCampaign: row.utmCampaign ?? null,
    referrer: row.referrer ?? null,
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
        ...(input.id ? { id: input.id } : {}),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        company: input.company?.trim() || null,
        source: input.source,
        message: input.message?.trim() || null,
        status: input.status ?? "NEW",
        followUpAt: input.followUpAt ?? null,
        estimatedValue: input.estimatedValue ?? null,
        landingPage: input.landingPage?.trim() || null,
        utmSource: input.utmSource?.trim() || null,
        utmMedium: input.utmMedium?.trim() || null,
        utmCampaign: input.utmCampaign?.trim() || null,
        referrer: input.referrer?.trim() || null,
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

export async function listCrmLeads(params: ListCrmLeadsParams = {}): Promise<ListCrmLeadsResult> {
  const emptyKpis = Object.fromEntries(
    CRM_LEAD_STATUSES.map((status) => [status, 0])
  ) as CrmLeadKpis;

  if (!(await isCrmLeadTableReady())) {
    return {
      leads: [],
      total: 0,
      kpis: emptyKpis,
      valueKpis: emptyValueKpis(),
      reminders: emptyReminders(),
      error: "Bảng Lead chưa sẵn sàng. Chạy npx prisma migrate deploy.",
    };
  }

  try {
    await ensureCrmLeadsSynced();

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

    const activeFollowUp = { status: { notIn: ["WON", "LOST"] as LeadStatus[] } };

    const [
      rows,
      total,
      statusGroups,
      dueToday,
      overdue,
      dueTodayLeads,
      overdueLeads,
      pipelineAgg,
      wonAgg,
    ] = await Promise.all([
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
          ...activeFollowUp,
        },
      }),
      prisma.lead.count({
        where: {
          followUpAt: { lt: startOfToday },
          ...activeFollowUp,
        },
      }),
      prisma.lead.findMany({
        where: {
          followUpAt: { gte: startOfToday, lt: endOfToday },
          ...activeFollowUp,
        },
        orderBy: { followUpAt: "asc" },
        take: 20,
      }),
      prisma.lead.findMany({
        where: {
          followUpAt: { lt: startOfToday },
          ...activeFollowUp,
        },
        orderBy: { followUpAt: "asc" },
        take: 20,
      }),
      prisma.lead.aggregate({
        _sum: { estimatedValue: true },
        where: { status: { notIn: ["WON", "LOST"] } },
      }),
      prisma.lead.aggregate({
        _sum: { estimatedValue: true },
        where: { status: "WON" },
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
      valueKpis: {
        pipelineTotal: decimalToString(pipelineAgg._sum.estimatedValue),
        wonTotal: decimalToString(wonAgg._sum.estimatedValue),
      },
      reminders: {
        dueToday,
        overdue,
        dueTodayLeads: dueTodayLeads.map(mapLeadRow),
        overdueLeads: overdueLeads.map(mapLeadRow),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải CRM leads";
    console.error("[CRM] listCrmLeads failed:", err);
    return {
      leads: [],
      total: 0,
      kpis: emptyKpis,
      valueKpis: emptyValueKpis(),
      reminders: emptyReminders(),
      error: message,
    };
  }
}

export async function getCrmLeadById(id: string): Promise<CrmLeadRecord | null> {
  if (!(await isCrmLeadTableReady())) return null;

  await ensureCrmLeadsSynced();

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
    estimatedValue?: number | null;
  }
): Promise<CrmLeadRecord | null> {
  if (!(await isCrmLeadTableReady())) return null;

  try {
    const row = await prisma.lead.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.followUpAt !== undefined ? { followUpAt: data.followUpAt } : {}),
        ...(data.estimatedValue !== undefined
          ? { estimatedValue: data.estimatedValue }
          : {}),
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
