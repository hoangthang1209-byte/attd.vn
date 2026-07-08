import type {
  SalesOpportunityPriority,
  SalesOpportunityStage,
} from "@prisma/client";
import { parseMoneyInput } from "@/features/pricing/parse-money";
import type {
  CreateSalesOpportunityInput,
  UpdateSalesOpportunityInput,
} from "@/features/sales/opportunities/types";

const STAGES = new Set<SalesOpportunityStage>([
  "NEW",
  "CONTACTED",
  "CONSULTING",
  "COSTING",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "LOST",
]);

const PRIORITIES = new Set<SalesOpportunityPriority>([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

function parseOptionalId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : null;
}

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value.trim() || null : null;
}

function parseOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseOptionalProbability(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string" && value.trim()) {
    const num = Number(value);
    if (Number.isFinite(num)) return Math.min(100, Math.max(0, Math.round(num)));
  }
  return undefined;
}

export function isValidSalesOpportunityStage(value: string): value is SalesOpportunityStage {
  return STAGES.has(value as SalesOpportunityStage);
}

export function isValidSalesOpportunityPriority(value: string): value is SalesOpportunityPriority {
  return PRIORITIES.has(value as SalesOpportunityPriority);
}

export function parseCreateSalesOpportunityBody(
  raw: Record<string, unknown>,
): CreateSalesOpportunityInput {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    throw new SalesOpportunityValidationError("Tiêu đề cơ hội là bắt buộc");
  }

  const stage =
    typeof raw.stage === "string" && isValidSalesOpportunityStage(raw.stage)
      ? raw.stage
      : undefined;
  const priority =
    typeof raw.priority === "string" && isValidSalesOpportunityPriority(raw.priority)
      ? raw.priority
      : undefined;

  const probability = parseOptionalProbability(raw.probability);

  return {
    title,
    stage,
    priority,
    leadId: parseOptionalId(raw.leadId),
    customerId: parseOptionalId(raw.customerId),
    contactId: parseOptionalId(raw.contactId),
    quoteId: parseOptionalId(raw.quoteId),
    pricingCalculationId: parseOptionalId(raw.pricingCalculationId),
    estimatedValue: parseMoneyInput(raw.estimatedValue),
    probability,
    expectedCloseDate: parseOptionalDate(raw.expectedCloseDate),
    nextFollowUpAt: parseOptionalDate(raw.nextFollowUpAt),
    assignedTo: parseOptionalString(raw.assignedTo),
    source: parseOptionalString(raw.source),
    note: parseOptionalString(raw.note),
  };
}

export function parseUpdateSalesOpportunityBody(
  raw: Record<string, unknown>,
): UpdateSalesOpportunityInput {
  const input: UpdateSalesOpportunityInput = {};

  if ("title" in raw) {
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) throw new SalesOpportunityValidationError("Tiêu đề cơ hội là bắt buộc");
    input.title = title;
  }

  if ("stage" in raw) {
    if (typeof raw.stage !== "string" || !isValidSalesOpportunityStage(raw.stage)) {
      throw new SalesOpportunityValidationError("Giai đoạn không hợp lệ");
    }
    input.stage = raw.stage;
  }

  if ("priority" in raw) {
    if (typeof raw.priority !== "string" || !isValidSalesOpportunityPriority(raw.priority)) {
      throw new SalesOpportunityValidationError("Ưu tiên không hợp lệ");
    }
    input.priority = raw.priority;
  }

  if ("leadId" in raw) input.leadId = parseOptionalId(raw.leadId) ?? null;
  if ("customerId" in raw) input.customerId = parseOptionalId(raw.customerId) ?? null;
  if ("contactId" in raw) input.contactId = parseOptionalId(raw.contactId) ?? null;
  if ("quoteId" in raw) input.quoteId = parseOptionalId(raw.quoteId) ?? null;
  if ("pricingCalculationId" in raw) {
    input.pricingCalculationId = parseOptionalId(raw.pricingCalculationId) ?? null;
  }
  if ("estimatedValue" in raw) input.estimatedValue = parseMoneyInput(raw.estimatedValue);
  if ("probability" in raw) {
    const probability = parseOptionalProbability(raw.probability);
    if (probability === undefined) {
      throw new SalesOpportunityValidationError("Xác suất phải từ 0 đến 100");
    }
    input.probability = probability;
  }
  if ("expectedCloseDate" in raw) {
    input.expectedCloseDate = parseOptionalDate(raw.expectedCloseDate) ?? null;
  }
  if ("nextFollowUpAt" in raw) {
    input.nextFollowUpAt = parseOptionalDate(raw.nextFollowUpAt) ?? null;
  }
  if ("assignedTo" in raw) input.assignedTo = parseOptionalString(raw.assignedTo) ?? null;
  if ("source" in raw) input.source = parseOptionalString(raw.source) ?? null;
  if ("note" in raw) input.note = parseOptionalString(raw.note) ?? null;
  if ("lostReason" in raw) input.lostReason = parseOptionalString(raw.lostReason) ?? null;

  return input;
}

export class SalesOpportunityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesOpportunityValidationError";
  }
}
