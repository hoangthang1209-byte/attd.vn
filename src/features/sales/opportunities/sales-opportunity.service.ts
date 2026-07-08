import type { Prisma, QuoteStatus, PricingCalculationStatus, SalesOpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SALES_OPPORTUNITY_STAGE_ORDER } from "@/features/sales/opportunities/labels";
import { generateSalesOpportunityCode } from "@/features/sales/opportunities/sales-opportunity-code";
import { SalesOpportunityValidationError } from "@/features/sales/opportunities/sales-opportunity-input";
import { mapActivityRow } from "@/features/crm/mappers";
import type {
  CreateSalesOpportunityInput,
  ListSalesOpportunitiesInput,
  SalesOpportunityCustomerSummary,
  SalesOpportunityContactSummary,
  SalesOpportunityLeadSummary,
  SalesOpportunityListRecord,
  SalesOpportunityPipelineResult,
  SalesOpportunityPipelineStats,
  SalesOpportunityPricingSummary,
  SalesOpportunityQuoteSummary,
  SalesOpportunityStageStats,
  SalesOpportunityTimelineEntry,
  SalesOpportunityWorkspaceResult,
  UpdateSalesOpportunityInput,
} from "@/features/sales/opportunities/types";

const opportunityInclude = {
  lead: { select: { id: true, code: true, fullName: true, companyName: true, company: true } },
  customer: { select: { id: true, code: true, name: true } },
  quote: { select: { id: true, quoteNo: true } },
  pricingCalculation: { select: { id: true, code: true } },
} satisfies Prisma.SalesOpportunityInclude;

type OpportunityRow = Prisma.SalesOpportunityGetPayload<{ include: typeof opportunityInclude }>;

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function isTerminalStage(stage: SalesOpportunityStage): boolean {
  return stage === "WON" || stage === "LOST";
}

function isFollowUpOverdue(nextFollowUpAt: Date | null, stage: SalesOpportunityStage): boolean {
  if (!nextFollowUpAt || isTerminalStage(stage)) return false;
  return nextFollowUpAt.getTime() < Date.now();
}

function buildLeadLabel(lead: OpportunityRow["lead"]): string | null {
  if (!lead) return null;
  const name = lead.companyName || lead.company || lead.fullName;
  return lead.code ? `${lead.code} · ${name}` : name;
}

function mapOpportunity(row: OpportunityRow): SalesOpportunityListRecord {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    stage: row.stage,
    priority: row.priority,
    leadId: row.leadId,
    customerId: row.customerId,
    contactId: row.contactId,
    quoteId: row.quoteId,
    pricingCalculationId: row.pricingCalculationId,
    estimatedValue: decimalToNumber(row.estimatedValue),
    probability: row.probability,
    expectedCloseDate: row.expectedCloseDate?.toISOString() ?? null,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    assignedTo: row.assignedTo,
    source: row.source,
    note: row.note,
    lostReason: row.lostReason,
    wonAt: row.wonAt?.toISOString() ?? null,
    lostAt: row.lostAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    leadLabel: buildLeadLabel(row.lead),
    customerLabel: row.customer ? `${row.customer.code} · ${row.customer.name}` : null,
    quoteNo: row.quote?.quoteNo ?? null,
    pricingCalculationCode: row.pricingCalculation?.code ?? null,
    isFollowUpOverdue: isFollowUpOverdue(row.nextFollowUpAt, row.stage),
  };
}

function emptyStageStats(): Record<SalesOpportunityStage, SalesOpportunityStageStats> {
  return SALES_OPPORTUNITY_STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = { count: 0, estimatedValue: 0 };
      return acc;
    },
    {} as Record<SalesOpportunityStage, SalesOpportunityStageStats>,
  );
}

function buildPipelineStats(
  opportunities: SalesOpportunityListRecord[],
): SalesOpportunityPipelineStats {
  const byStage = emptyStageStats();
  let totalEstimatedValue = 0;
  let quotedValue = 0;
  let wonValue = 0;
  let followUpOverdueCount = 0;

  for (const opp of opportunities) {
    const value = opp.estimatedValue ?? 0;
    totalEstimatedValue += value;
    byStage[opp.stage].count += 1;
    byStage[opp.stage].estimatedValue += value;

    if (opp.stage === "QUOTED") quotedValue += value;
    if (opp.stage === "WON") wonValue += value;
    if (opp.isFollowUpOverdue) followUpOverdueCount += 1;
  }

  return {
    total: opportunities.length,
    totalEstimatedValue,
    quotedValue,
    wonValue,
    followUpOverdueCount,
    byStage,
  };
}

function groupByStage(
  opportunities: SalesOpportunityListRecord[],
): Record<SalesOpportunityStage, SalesOpportunityListRecord[]> {
  const grouped = SALES_OPPORTUNITY_STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = [];
      return acc;
    },
    {} as Record<SalesOpportunityStage, SalesOpportunityListRecord[]>,
  );

  for (const opp of opportunities) {
    grouped[opp.stage].push(opp);
  }

  return grouped;
}

async function assertRelationIds(input: {
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  quoteId?: string | null;
  pricingCalculationId?: string | null;
}): Promise<void> {
  const checks: Promise<void>[] = [];

  if (input.leadId) {
    checks.push(
      prisma.lead.findUnique({ where: { id: input.leadId }, select: { id: true } }).then((row) => {
        if (!row) throw new SalesOpportunityValidationError("Lead không tồn tại");
      }),
    );
  }
  if (input.customerId) {
    checks.push(
      prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }).then((row) => {
        if (!row) throw new SalesOpportunityValidationError("Khách hàng không tồn tại");
      }),
    );
  }
  if (input.contactId) {
    checks.push(
      prisma.contact.findUnique({ where: { id: input.contactId }, select: { id: true } }).then((row) => {
        if (!row) throw new SalesOpportunityValidationError("Liên hệ không tồn tại");
      }),
    );
  }
  if (input.quoteId) {
    checks.push(
      prisma.quote.findUnique({ where: { id: input.quoteId }, select: { id: true } }).then((row) => {
        if (!row) throw new SalesOpportunityValidationError("Báo giá không tồn tại");
      }),
    );
  }
  if (input.pricingCalculationId) {
    checks.push(
      prisma.pricingCalculation
        .findUnique({ where: { id: input.pricingCalculationId }, select: { id: true } })
        .then((row) => {
          if (!row) throw new SalesOpportunityValidationError("Bản tính giá không tồn tại");
        }),
    );
  }

  await Promise.all(checks);
}

function buildStageUpdateData(stage: SalesOpportunityStage): {
  stage: SalesOpportunityStage;
  wonAt?: Date | null;
  lostAt?: Date | null;
} {
  const now = new Date();
  if (stage === "WON") {
    return { stage, wonAt: now, lostAt: null };
  }
  if (stage === "LOST") {
    return { stage, lostAt: now, wonAt: null };
  }
  return { stage };
}

export async function listSalesOpportunities(
  input: ListSalesOpportunitiesInput = {},
): Promise<SalesOpportunityPipelineResult> {
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
  const where: Prisma.SalesOpportunityWhereInput = {};

  if (input.stage) where.stage = input.stage;
  if (input.priority) where.priority = input.priority;

  if (input.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { source: { contains: q, mode: "insensitive" } },
      { assignedTo: { contains: q, mode: "insensitive" } },
      { lead: { fullName: { contains: q, mode: "insensitive" } } },
      { lead: { companyName: { contains: q, mode: "insensitive" } } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { quote: { quoteNo: { contains: q, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.salesOpportunity.findMany({
    where,
    include: opportunityInclude,
    orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  const opportunities = rows.map(mapOpportunity);

  return {
    opportunities,
    groupedByStage: groupByStage(opportunities),
    stats: buildPipelineStats(opportunities),
  };
}

export async function getSalesOpportunityById(id: string): Promise<SalesOpportunityListRecord | null> {
  const row = await prisma.salesOpportunity.findUnique({
    where: { id },
    include: opportunityInclude,
  });
  return row ? mapOpportunity(row) : null;
}

const workspaceInclude = {
  lead: {
    select: {
      id: true,
      code: true,
      fullName: true,
      companyName: true,
      company: true,
      phone: true,
      email: true,
    },
  },
  customer: {
    select: { id: true, code: true, name: true, phone: true, email: true },
  },
  contact: {
    select: { id: true, fullName: true, title: true, phone: true, email: true },
  },
  quote: {
    select: {
      id: true,
      quoteNo: true,
      status: true,
      totalAmount: true,
      manualOverride: true,
      manualTotalAmount: true,
      validUntil: true,
      createdAt: true,
    },
  },
  pricingCalculation: {
    select: { id: true, code: true, status: true, totalAmount: true, createdAt: true },
  },
} satisfies Prisma.SalesOpportunityInclude;

function mapQuoteSummary(row: {
  id: string;
  quoteNo: string;
  status: QuoteStatus;
  totalAmount: Prisma.Decimal;
  manualOverride: boolean;
  manualTotalAmount: Prisma.Decimal | null;
  validUntil: Date | null;
  createdAt: Date;
}): SalesOpportunityQuoteSummary {
  const totalAmount = row.manualOverride && row.manualTotalAmount != null
    ? row.manualTotalAmount.toNumber()
    : row.totalAmount.toNumber();

  return {
    id: row.id,
    quoteNo: row.quoteNo,
    status: row.status,
    totalAmount,
    validUntil: row.validUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPricingSummary(row: {
  id: string;
  code: string;
  status: PricingCalculationStatus;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
}): SalesOpportunityPricingSummary {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    totalAmount: row.totalAmount.toNumber(),
    createdAt: row.createdAt.toISOString(),
  };
}

function buildWorkspaceTimeline(
  opportunity: SalesOpportunityListRecord,
  activities: SalesOpportunityWorkspaceResult["activities"],
): SalesOpportunityTimelineEntry[] {
  const timeline: SalesOpportunityTimelineEntry[] = activities.map((activity) => ({
    id: activity.id,
    kind: "activity",
    createdAt: activity.createdAt,
    type: activity.type,
    title: activity.title,
    content: activity.content,
    outcome: activity.outcome,
    nextFollowUpAt: activity.nextFollowUpAt,
  }));

  timeline.push({
    id: `opportunity-created-${opportunity.id}`,
    kind: "opportunity",
    createdAt: opportunity.createdAt,
    type: "OPPORTUNITY",
    title: "Tạo cơ hội bán hàng",
    content: opportunity.note,
    outcome: null,
    nextFollowUpAt: null,
  });

  if (opportunity.updatedAt !== opportunity.createdAt) {
    timeline.push({
      id: `opportunity-updated-${opportunity.id}`,
      kind: "opportunity",
      createdAt: opportunity.updatedAt,
      type: "OPPORTUNITY",
      title: "Cập nhật cơ hội",
      content: null,
      outcome: null,
      nextFollowUpAt: opportunity.nextFollowUpAt,
    });
  }

  if (opportunity.wonAt) {
    timeline.push({
      id: `opportunity-won-${opportunity.id}`,
      kind: "opportunity",
      createdAt: opportunity.wonAt,
      type: "OPPORTUNITY",
      title: "Đánh dấu thắng",
      content: null,
      outcome: null,
      nextFollowUpAt: null,
    });
  }

  if (opportunity.lostAt) {
    timeline.push({
      id: `opportunity-lost-${opportunity.id}`,
      kind: "opportunity",
      createdAt: opportunity.lostAt,
      type: "OPPORTUNITY",
      title: "Đánh dấu thua",
      content: opportunity.lostReason,
      outcome: null,
      nextFollowUpAt: null,
    });
  }

  return timeline.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getSalesOpportunityWorkspace(
  id: string,
): Promise<SalesOpportunityWorkspaceResult | null> {
  const row = await prisma.salesOpportunity.findUnique({
    where: { id },
    include: workspaceInclude,
  });
  if (!row) return null;

  const opportunity = mapOpportunity(row);

  const lead: SalesOpportunityLeadSummary | null = row.lead
    ? {
        id: row.lead.id,
        code: row.lead.code,
        fullName: row.lead.fullName,
        companyName: row.lead.companyName,
        company: row.lead.company,
        phone: row.lead.phone,
        email: row.lead.email,
      }
    : null;

  const customer: SalesOpportunityCustomerSummary | null = row.customer
    ? {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        phone: row.customer.phone,
        email: row.customer.email,
      }
    : null;

  const contact: SalesOpportunityContactSummary | null = row.contact
    ? {
        id: row.contact.id,
        fullName: row.contact.fullName,
        title: row.contact.title,
        phone: row.contact.phone,
        email: row.contact.email,
      }
    : null;

  const quote = row.quote ? mapQuoteSummary(row.quote) : null;
  const pricingCalculation = row.pricingCalculation
    ? mapPricingSummary(row.pricingCalculation)
    : null;

  const relationFilters: Prisma.QuoteWhereInput[] = [];
  const calculationFilters: Prisma.PricingCalculationWhereInput[] = [];
  const activityFilters: Prisma.CRMActivityWhereInput[] = [];

  if (row.leadId) {
    relationFilters.push({ leadId: row.leadId });
    calculationFilters.push({ leadId: row.leadId });
    activityFilters.push({ leadId: row.leadId });
  }
  if (row.customerId) {
    relationFilters.push({ customerId: row.customerId });
    calculationFilters.push({ customerId: row.customerId });
    activityFilters.push({ customerId: row.customerId });
  }
  if (row.contactId) {
    activityFilters.push({ contactId: row.contactId });
  }

  const [relatedQuoteRows, relatedCalculationRows, activityRows] = await Promise.all([
    relationFilters.length > 0
      ? prisma.quote.findMany({
          where: { OR: relationFilters },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            quoteNo: true,
            status: true,
            totalAmount: true,
            manualOverride: true,
            manualTotalAmount: true,
            validUntil: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    calculationFilters.length > 0
      ? prisma.pricingCalculation.findMany({
          where: { OR: calculationFilters },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            code: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    activityFilters.length > 0
      ? prisma.cRMActivity.findMany({
          where: { OR: activityFilters },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const relatedQuotes = relatedQuoteRows
    .map(mapQuoteSummary)
    .filter((item) => item.id !== quote?.id)
    .slice(0, 5);

  const relatedCalculations = relatedCalculationRows
    .map(mapPricingSummary)
    .filter((item) => item.id !== pricingCalculation?.id)
    .slice(0, 5);

  const activities = activityRows.map(mapActivityRow);
  const timeline = buildWorkspaceTimeline(opportunity, activities);

  return {
    opportunity,
    lead,
    customer,
    contact,
    quote,
    pricingCalculation,
    relatedQuotes,
    relatedCalculations,
    activities,
    timeline,
  };
}

export async function createSalesOpportunity(
  input: CreateSalesOpportunityInput,
): Promise<SalesOpportunityListRecord> {
  await assertRelationIds(input);

  const code = await generateSalesOpportunityCode();
  const row = await prisma.salesOpportunity.create({
    data: {
      code,
      title: input.title,
      stage: input.stage ?? "NEW",
      priority: input.priority ?? "NORMAL",
      leadId: input.leadId ?? null,
      customerId: input.customerId ?? null,
      contactId: input.contactId ?? null,
      quoteId: input.quoteId ?? null,
      pricingCalculationId: input.pricingCalculationId ?? null,
      estimatedValue: input.estimatedValue ?? null,
      probability: input.probability ?? 30,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
      assignedTo: input.assignedTo ?? null,
      source: input.source ?? null,
      note: input.note ?? null,
      ...(input.stage === "WON"
        ? { wonAt: new Date(), lostAt: null }
        : input.stage === "LOST"
          ? { lostAt: new Date(), wonAt: null }
          : {}),
    },
    include: opportunityInclude,
  });

  return mapOpportunity(row);
}

export async function updateSalesOpportunity(
  id: string,
  input: UpdateSalesOpportunityInput,
): Promise<SalesOpportunityListRecord> {
  const existing = await prisma.salesOpportunity.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new SalesOpportunityValidationError("Cơ hội không tồn tại");
  }

  await assertRelationIds(input);

  const data: Prisma.SalesOpportunityUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.leadId !== undefined) data.lead = input.leadId ? { connect: { id: input.leadId } } : { disconnect: true };
  if (input.customerId !== undefined) {
    data.customer = input.customerId ? { connect: { id: input.customerId } } : { disconnect: true };
  }
  if (input.contactId !== undefined) {
    data.contact = input.contactId ? { connect: { id: input.contactId } } : { disconnect: true };
  }
  if (input.quoteId !== undefined) {
    data.quote = input.quoteId ? { connect: { id: input.quoteId } } : { disconnect: true };
  }
  if (input.pricingCalculationId !== undefined) {
    data.pricingCalculation = input.pricingCalculationId
      ? { connect: { id: input.pricingCalculationId } }
      : { disconnect: true };
  }
  if (input.estimatedValue !== undefined) data.estimatedValue = input.estimatedValue;
  if (input.probability !== undefined) data.probability = input.probability;
  if (input.expectedCloseDate !== undefined) {
    data.expectedCloseDate = input.expectedCloseDate ? new Date(input.expectedCloseDate) : null;
  }
  if (input.nextFollowUpAt !== undefined) {
    data.nextFollowUpAt = input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null;
  }
  if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo;
  if (input.source !== undefined) data.source = input.source;
  if (input.note !== undefined) data.note = input.note;
  if (input.lostReason !== undefined) data.lostReason = input.lostReason;

  if (input.stage !== undefined) {
    Object.assign(data, buildStageUpdateData(input.stage));
  }

  const row = await prisma.salesOpportunity.update({
    where: { id },
    data,
    include: opportunityInclude,
  });

  return mapOpportunity(row);
}

export async function updateSalesOpportunityStage(
  id: string,
  stage: SalesOpportunityStage,
): Promise<SalesOpportunityListRecord> {
  const existing = await prisma.salesOpportunity.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new SalesOpportunityValidationError("Cơ hội không tồn tại");
  }

  const row = await prisma.salesOpportunity.update({
    where: { id },
    data: buildStageUpdateData(stage),
    include: opportunityInclude,
  });

  return mapOpportunity(row);
}
