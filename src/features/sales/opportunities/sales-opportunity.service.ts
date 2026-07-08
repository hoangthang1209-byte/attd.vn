import type { Prisma, SalesOpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SALES_OPPORTUNITY_STAGE_ORDER } from "@/features/sales/opportunities/labels";
import { generateSalesOpportunityCode } from "@/features/sales/opportunities/sales-opportunity-code";
import { SalesOpportunityValidationError } from "@/features/sales/opportunities/sales-opportunity-input";
import type {
  CreateSalesOpportunityInput,
  ListSalesOpportunitiesInput,
  SalesOpportunityListRecord,
  SalesOpportunityPipelineResult,
  SalesOpportunityPipelineStats,
  SalesOpportunityStageStats,
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
