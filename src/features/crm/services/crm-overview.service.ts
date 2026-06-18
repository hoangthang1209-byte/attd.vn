import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapActivityRow, mapLeadRow } from "@/features/crm/mappers";
import { listRecentActivities } from "@/features/crm/services/crm-activity.service";
import type { CrmOverviewMetrics } from "@/features/crm/types";
import { isCrmLeadTableReady } from "@/features/crm/services/crm-lead.service";

const CARE_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "NEED_PRICING",
  "QUOTED",
  "QUOTING",
  "NEGOTIATING",
];

export async function getCrmOverview(): Promise<CrmOverviewMetrics> {
  const empty: CrmOverviewMetrics = {
    newLeads: 0,
    leadsNeedCare: 0,
    leadsNeedPricing: 0,
    prospectCustomers: 0,
    activeCustomers: 0,
    recentLeads: [],
    recentActivities: [],
  };

  if (!(await isCrmLeadTableReady())) {
    return empty;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  try {
    const [
      newLeads,
      leadsNeedCare,
      leadsNeedPricing,
      prospectCustomers,
      activeCustomers,
      recentLeadRows,
      recentActivities,
    ] = await Promise.all([
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.lead.count({
        where: {
          OR: [
            {
              nextFollowUpAt: { lte: endOfToday },
              status: { in: CARE_STATUSES },
            },
            {
              followUpAt: { lte: endOfToday },
              status: { in: CARE_STATUSES },
              nextFollowUpAt: null,
            },
          ],
        },
      }),
      prisma.lead.count({ where: { status: "NEED_PRICING" } }),
      prisma.customer.count({ where: { status: "PROSPECT" } }).catch(() => 0),
      prisma.customer.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      listRecentActivities(8),
    ]);

    return {
      newLeads,
      leadsNeedCare,
      leadsNeedPricing,
      prospectCustomers,
      activeCustomers,
      recentLeads: recentLeadRows.map(mapLeadRow),
      recentActivities,
    };
  } catch (err) {
    console.error("[CRM] getCrmOverview failed:", err);
    return empty;
  }
}

export async function getActivitiesForDisplay(limit = 20) {
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
