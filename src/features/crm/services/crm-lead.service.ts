import {
  Prisma,
  type LeadPipelineStatus,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLeadCode, generateCustomerCode } from "@/features/crm/crm-code";
import { mapFormSourceToCrmSource } from "@/features/crm/labels";
import {
  decimalToString,
  LEAD_DETAIL_INCLUDE,
  mapLeadRow,
} from "@/features/crm/mappers";
import { createCRMActivity } from "@/features/crm/services/crm-activity.service";
import { resolveProductInterestSnapshot } from "@/features/crm/services/crm-product-interest-snapshot";
import {
  CRM_LEAD_PRIORITIES,
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUSES,
  type CreateCrmLeadInput,
  type CreateProductInterestInput,
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

function resolveLeadIdentity(input: CreateCrmLeadInput) {
  const contactName = input.contactName?.trim() || input.fullName?.trim() || "";
  const companyName = input.companyName?.trim() || input.company?.trim() || "";
  const phone = input.phone?.trim() || "";
  const email = input.email?.trim() || "";

  return {
    contactName: contactName || null,
    companyName: companyName || null,
    fullName: contactName || companyName || phone || email || "Lead mới",
    phone: phone || "—",
    email: email || null,
  };
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
      WHERE migration_name LIKE '%crm%' AND finished_at IS NOT NULL
      ORDER BY finished_at DESC
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

    const contactName = dealerLead.contactName;
    const companyName = dealerLead.companyName;

    await prisma.lead.upsert({
      where: { id: dealerLead.id },
      create: {
        id: dealerLead.id,
        code: await generateLeadCode(),
        fullName: contactName,
        contactName,
        phone: dealerLead.phone,
        email: dealerLead.email,
        company: companyName,
        companyName,
        source: mapFormSourceToCrmSource(dealerLead.source),
        status,
        message: messageParts.length > 0 ? messageParts.join("\n") : null,
        followUpAt: dealerLead.contactedAt,
        nextFollowUpAt: dealerLead.contactedAt,
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

    const identity = resolveLeadIdentity(input);
    const code = await generateLeadCode();
    const interests = [
      ...(input.productInterests ?? []),
      ...(input.productInterest ? [input.productInterest] : []),
    ];

    if (interests.length > 0) {
      const lead = await prisma.$transaction(async (tx) => {
        const row = await tx.lead.create({
          data: {
            ...(input.id ? { id: input.id } : {}),
            code,
            fullName: identity.fullName,
            contactName: identity.contactName,
            companyName: identity.companyName,
            phone: identity.phone,
            email: identity.email,
            zalo: input.zalo?.trim() || null,
            company: identity.companyName,
            source: input.source ?? "WEBSITE",
            sourceDetail: input.sourceDetail?.trim() || null,
            demand: input.demand?.trim() || input.message?.trim() || null,
            message: input.message?.trim() || null,
            note: input.note?.trim() || null,
            status: input.status ?? "NEW",
            priority: input.priority ?? "NORMAL",
            followUpAt: input.followUpAt ?? input.nextFollowUpAt ?? null,
            nextFollowUpAt: input.nextFollowUpAt ?? input.followUpAt ?? null,
            estimatedValue: input.estimatedValue ?? null,
            assignedTo: input.assignedTo?.trim() || null,
            landingPage: input.landingPage?.trim() || null,
            utmSource: input.utmSource?.trim() || null,
            utmMedium: input.utmMedium?.trim() || null,
            utmCampaign: input.utmCampaign?.trim() || null,
            referrer: input.referrer?.trim() || null,
          },
        });

        for (const interest of interests) {
          const productNameSnapshot = await resolveProductInterestSnapshot(interest);
          await tx.cRMProductInterest.create({
            data: {
              leadId: row.id,
              productId: interest.productId ?? null,
              variantId: interest.variantId ?? null,
              productNameSnapshot,
              quantity: interest.quantity ?? null,
              unit: interest.unit?.trim() || "cái",
              requirementNote: interest.requirementNote?.trim() || null,
              serviceNeeds: interest.serviceNeeds ?? undefined,
            },
          });
        }

        return row;
      });

      return mapLeadRow(lead);
    }

    const row = await prisma.lead.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        code,
        fullName: identity.fullName,
        contactName: identity.contactName,
        companyName: identity.companyName,
        phone: identity.phone,
        email: identity.email,
        zalo: input.zalo?.trim() || null,
        company: identity.companyName,
        source: input.source ?? "WEBSITE",
        sourceDetail: input.sourceDetail?.trim() || null,
        demand: input.demand?.trim() || input.message?.trim() || null,
        message: input.message?.trim() || null,
        note: input.note?.trim() || null,
        status: input.status ?? "NEW",
        priority: input.priority ?? "NORMAL",
        followUpAt: input.followUpAt ?? input.nextFollowUpAt ?? null,
        nextFollowUpAt: input.nextFollowUpAt ?? input.followUpAt ?? null,
        estimatedValue: input.estimatedValue ?? null,
        assignedTo: input.assignedTo?.trim() || null,
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

function qualifyLeadStatusIfNeeded(status: LeadStatus): LeadStatus {
  if (status === "NEW" || status === "CONTACTED") return "QUALIFIED";
  return status;
}

async function createProductInterestsForLead(
  tx: Prisma.TransactionClient,
  leadId: string,
  interests: CreateProductInterestInput[]
) {
  if (!interests?.length) return;

  for (const interest of interests) {
    const productNameSnapshot = await resolveProductInterestSnapshot(interest);
    await tx.cRMProductInterest.create({
      data: {
        leadId,
        productId: interest.productId ?? null,
        variantId: interest.variantId ?? null,
        productNameSnapshot,
        quantity: interest.quantity ?? null,
        unit: interest.unit?.trim() || "cái",
        requirementNote: interest.requirementNote?.trim() || null,
        serviceNeeds: interest.serviceNeeds ?? undefined,
      },
    });
  }
}

export async function createAdminLead(
  input: CreateCrmLeadInput
): Promise<CrmLeadRecord | null> {
  const contactName = input.contactName?.trim() || input.fullName?.trim() || "";
  const companyName = input.companyName?.trim() || input.company?.trim() || "";
  const phone = input.phone?.trim() || "";
  const email = input.email?.trim() || "";

  if (!contactName && !companyName && !phone && !email) {
    return null;
  }

  try {
    if (!(await isCrmLeadTableReady())) return null;

    const identity = resolveLeadIdentity(input);
    const code = await generateLeadCode();

    const lead = await prisma.$transaction(async (tx) => {
      const row = await tx.lead.create({
        data: {
          code,
          fullName: identity.fullName,
          contactName: identity.contactName,
          companyName: identity.companyName,
          phone: identity.phone,
          email: identity.email,
          zalo: input.zalo?.trim() || null,
          company: identity.companyName,
          source: input.source ?? "WEBSITE",
          sourceDetail: input.sourceDetail?.trim() || null,
          demand: input.demand?.trim() || null,
          note: input.note?.trim() || null,
          status: input.status ?? "NEW",
          priority: input.priority ?? "NORMAL",
          nextFollowUpAt: input.nextFollowUpAt ?? input.followUpAt ?? null,
          followUpAt: input.nextFollowUpAt ?? input.followUpAt ?? null,
          estimatedValue: input.estimatedValue ?? null,
          assignedTo: input.assignedTo?.trim() || null,
        },
      });

      await tx.cRMActivity.create({
        data: {
          leadId: row.id,
          type: "NOTE",
          title: "Tạo lead mới",
        },
      });

      const interests = [
        ...(input.productInterests ?? []),
        ...(input.productInterest ? [input.productInterest] : []),
      ].filter(
        (item) =>
          item.productId ||
          item.productNameSnapshot?.trim() ||
          item.quantity ||
          item.requirementNote?.trim()
      );

      if (interests.length > 0) {
        await createProductInterestsForLead(tx, row.id, interests);
      }

      return row;
    });

    return getCrmLeadById(lead.id);
  } catch (err) {
    console.error("[CRM] createAdminLead failed:", err);
    return null;
  }
}

export type ListCrmLeadsParams = {
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
  priority?: LeadPriority;
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
        { contactName: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { demand: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }
    if (params.source) where.source = params.source;
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;

    const limit = Math.min(200, Math.max(1, params.limit ?? 100));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const activeFollowUp = { status: { notIn: ["WON", "LOST", "NOT_FIT"] as LeadStatus[] } };

    const followUpFilter = {
      OR: [
        { nextFollowUpAt: { gte: startOfToday, lt: endOfToday } },
        { nextFollowUpAt: null, followUpAt: { gte: startOfToday, lt: endOfToday } },
      ],
    };

    const overdueFilter = {
      OR: [
        { nextFollowUpAt: { lt: startOfToday } },
        { nextFollowUpAt: null, followUpAt: { lt: startOfToday } },
      ],
    };

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
        include: { customer: true },
      }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.lead.count({
        where: { ...activeFollowUp, ...followUpFilter },
      }),
      prisma.lead.count({
        where: { ...activeFollowUp, ...overdueFilter },
      }),
      prisma.lead.findMany({
        where: { ...activeFollowUp, ...followUpFilter },
        orderBy: [{ nextFollowUpAt: "asc" }, { followUpAt: "asc" }],
        take: 20,
      }),
      prisma.lead.findMany({
        where: { ...activeFollowUp, ...overdueFilter },
        orderBy: [{ nextFollowUpAt: "asc" }, { followUpAt: "asc" }],
        take: 20,
      }),
      prisma.lead.aggregate({
        _sum: { estimatedValue: true },
        where: { status: { notIn: ["WON", "LOST", "NOT_FIT"] } },
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
    include: LEAD_DETAIL_INCLUDE,
  });

  return row ? mapLeadRow(row) : null;
}

export async function updateCrmLead(
  id: string,
  data: {
    status?: LeadStatus;
    priority?: LeadPriority;
    followUpAt?: Date | null;
    nextFollowUpAt?: Date | null;
    estimatedValue?: number | null;
    contactName?: string | null;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    zalo?: string | null;
    source?: LeadSource;
    sourceDetail?: string | null;
    demand?: string | null;
    note?: string | null;
    assignedTo?: string | null;
  }
): Promise<CrmLeadRecord | null> {
  if (!(await isCrmLeadTableReady())) return null;

  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return null;

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.priority !== undefined ? { priority: data.priority } : {}),
          ...(data.followUpAt !== undefined ? { followUpAt: data.followUpAt } : {}),
          ...(data.nextFollowUpAt !== undefined
            ? { nextFollowUpAt: data.nextFollowUpAt }
            : {}),
          ...(data.estimatedValue !== undefined
            ? { estimatedValue: data.estimatedValue }
            : {}),
          ...(data.contactName !== undefined
            ? {
                contactName: data.contactName?.trim() || null,
                fullName:
                  data.contactName?.trim() ||
                  data.companyName?.trim() ||
                  existing.fullName,
              }
            : {}),
          ...(data.companyName !== undefined
            ? {
                companyName: data.companyName?.trim() || null,
                company: data.companyName?.trim() || null,
              }
            : {}),
          ...(data.phone !== undefined ? { phone: data.phone?.trim() || "—" } : {}),
          ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
          ...(data.zalo !== undefined ? { zalo: data.zalo?.trim() || null } : {}),
          ...(data.source !== undefined ? { source: data.source } : {}),
          ...(data.sourceDetail !== undefined
            ? { sourceDetail: data.sourceDetail?.trim() || null }
            : {}),
          ...(data.demand !== undefined ? { demand: data.demand?.trim() || null } : {}),
          ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
          ...(data.assignedTo !== undefined
            ? { assignedTo: data.assignedTo?.trim() || null }
            : {}),
        },
      });

      if (data.status !== undefined && data.status !== existing.status) {
        await tx.cRMActivity.create({
          data: {
            leadId: id,
            type: "STATUS_CHANGE",
            title: "Cập nhật trạng thái lead",
            content: `${existing.status} → ${data.status}`,
          },
        });
      }

      return updated;
    });

    return getCrmLeadById(row.id);
  } catch {
    return null;
  }
}

export async function convertLeadToCustomer(leadId: string): Promise<CrmLeadRecord | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.convertedAt || lead.customerId) {
    return lead ? getCrmLeadById(leadId) : null;
  }

  const customerName =
    lead.companyName?.trim() || lead.company?.trim() || lead.contactName?.trim() || lead.fullName;

  try {
    await prisma.$transaction(async (tx) => {
      const customerCode = await generateCustomerCode();
      const customer = await tx.customer.create({
        data: {
          code: customerCode,
          type: "BUSINESS",
          name: customerName,
          phone: lead.phone !== "—" ? lead.phone : null,
          email: lead.email,
          status: "PROSPECT",
          note: lead.note,
        },
      });

      const contactFullName =
        lead.contactName?.trim() || lead.fullName || customerName;

      const contact = await tx.contact.create({
        data: {
          customerId: customer.id,
          fullName: contactFullName,
          phone: lead.phone !== "—" ? lead.phone : null,
          email: lead.email,
          zalo: lead.zalo,
          isPrimary: true,
        },
      });

      const nextStatus = qualifyLeadStatusIfNeeded(lead.status);

      await tx.lead.update({
        where: { id: leadId },
        data: {
          customerId: customer.id,
          contactId: contact.id,
          convertedAt: new Date(),
          status: nextStatus,
        },
      });

      await tx.cRMProductInterest.updateMany({
        where: { leadId },
        data: { customerId: customer.id },
      });

      await tx.cRMActivity.create({
        data: {
          leadId,
          customerId: customer.id,
          type: "NOTE",
          title: "Đã chuyển lead thành khách hàng",
        },
      });
    });

    return getCrmLeadById(leadId);
  } catch (err) {
    console.error("[CRM] convertLeadToCustomer failed:", err);
    return null;
  }
}

export type LinkLeadToCustomerInput = {
  customerId: string;
  createContact?: boolean;
  contactId?: string | null;
};

export async function linkLeadToExistingCustomer(
  leadId: string,
  input: LinkLeadToCustomerInput
): Promise<CrmLeadRecord | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.customerId) {
    return lead ? getCrmLeadById(leadId) : null;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { contacts: true },
  });
  if (!customer) return null;

  try {
    await prisma.$transaction(async (tx) => {
      let contactId = input.contactId ?? null;

      if (contactId) {
        const existing = customer.contacts.find((c) => c.id === contactId);
        if (!existing) contactId = null;
      }

      if (!contactId) {
        const leadPhone = lead.phone !== "—" ? lead.phone.trim() : "";
        const leadEmail = lead.email?.trim() || "";

        const matched = customer.contacts.find((contact) => {
          if (leadPhone && contact.phone?.trim() === leadPhone) return true;
          if (leadEmail && contact.email?.trim()?.toLowerCase() === leadEmail.toLowerCase()) {
            return true;
          }
          return false;
        });

        if (matched) {
          contactId = matched.id;
        } else if (input.createContact !== false) {
          const contactFullName =
            lead.contactName?.trim() || lead.fullName || customer.name;
          const hasContactData =
            contactFullName || leadPhone || leadEmail || lead.zalo?.trim();

          if (hasContactData) {
            const created = await tx.contact.create({
              data: {
                customerId: customer.id,
                fullName: contactFullName,
                phone: leadPhone || null,
                email: lead.email,
                zalo: lead.zalo,
                isPrimary: customer.contacts.length === 0,
              },
            });
            contactId = created.id;
          }
        }
      }

      const nextStatus = qualifyLeadStatusIfNeeded(lead.status);

      await tx.lead.update({
        where: { id: leadId },
        data: {
          customerId: customer.id,
          contactId,
          convertedAt: lead.convertedAt ?? new Date(),
          status: nextStatus,
        },
      });

      await tx.cRMProductInterest.updateMany({
        where: { leadId },
        data: { customerId: customer.id },
      });

      await tx.cRMActivity.create({
        data: {
          leadId,
          customerId: customer.id,
          contactId,
          type: "NOTE",
          title: "Đã gắn lead với khách hàng có sẵn",
        },
      });
    });

    return getCrmLeadById(leadId);
  } catch (err) {
    console.error("[CRM] linkLeadToExistingCustomer failed:", err);
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

    await createCRMActivity({
      leadId,
      type: "NOTE",
      title: "Ghi chú nội bộ",
      content: trimmed,
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

export function isValidLeadPriority(value: string): value is LeadPriority {
  return CRM_LEAD_PRIORITIES.includes(value as LeadPriority);
}
