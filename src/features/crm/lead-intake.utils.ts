import type { LeadSource } from "@prisma/client";
import type { EmployeeRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { isSalesCapableEmployeeRole } from "@/features/employees/employee-role";
import {
  LeadIntakeValidationError,
  type LeadIntakeChannel,
  type NormalizedLeadIntakeInput,
} from "@/features/crm/lead-intake.types";

const METADATA_MAX_KEYS = 32;
const METADATA_MAX_STRING_LEN = 500;
const SOURCE_REF_MAX_LEN = 255;

export function sanitizeSourceRef(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.trim().slice(0, SOURCE_REF_MAX_LEN);
}

export function sanitizeIntakeMetadata(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const out: Record<string, unknown> = {};
  let keyCount = 0;

  for (const [key, value] of Object.entries(raw)) {
    if (keyCount >= METADATA_MAX_KEYS) break;
    const safeKey = key.trim().slice(0, 64);
    if (!safeKey) continue;

    if (typeof value === "string") {
      out[safeKey] = value.slice(0, METADATA_MAX_STRING_LEN);
      keyCount += 1;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[safeKey] = value;
      keyCount += 1;
    } else if (typeof value === "boolean") {
      out[safeKey] = value;
      keyCount += 1;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

export function resolveLeadIntakeIdentity(input: NormalizedLeadIntakeInput) {
  const contactName = input.contactName?.trim() || input.fullName?.trim() || "";
  const companyName = input.companyName?.trim() || "";
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

export const VIETNAM_BUSINESS_TIMEZONE = "Asia/Ho_Chi_Minh";

function formatVietnamCalendarDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Start/end of the current business day in Vietnam (UTC+7, no DST). */
export function getVietnamBusinessDayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const vnDate = formatVietnamCalendarDate(now);
  const start = new Date(`${vnDate}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function isLeadFollowUpOverdue(
  nextFollowUpAt: string | Date | null | undefined,
  followUpAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  const target = nextFollowUpAt ?? followUpAt;
  if (!target) return false;

  const due = target instanceof Date ? target : new Date(target);
  if (Number.isNaN(due.getTime())) return false;

  const { start: startOfToday } = getVietnamBusinessDayBounds(now);
  return due < startOfToday;
}

export function mapIntakeChannelToDefaultSource(channel: LeadIntakeChannel): LeadSource {
  switch (channel) {
    case "GMAIL":
      return "GMAIL";
    case "MANUAL":
      return "MANUAL";
    case "WEBSITE":
      return "WEBSITE";
    case "WEBHOOK":
      return "OTHER";
    case "CSV_IMPORT":
      return "MANUAL";
    default:
      return "OTHER";
  }
}

export function buildIntakeAuditTitle(created: boolean, matchedBy: "source_ref" | "new"): string {
  if (!created && matchedBy === "source_ref") {
    return "Lead intake — idempotent replay";
  }
  return "Lead intake — created";
}

export function buildOwnerChangeAuditContent(
  previousOwnerId: string | null,
  nextOwnerId: string | null,
  previousOwnerName?: string | null,
  nextOwnerName?: string | null
): string {
  const prev = previousOwnerName?.trim() || previousOwnerId || "Chưa phân công";
  const next = nextOwnerName?.trim() || nextOwnerId || "Chưa phân công";
  return `${prev} → ${next}`;
}

export type SalesOwnerCandidate = {
  id: string;
  isActive: boolean;
  role: EmployeeRole | null;
};

export function resolveValidatedSalesOwnerId(
  employee: SalesOwnerCandidate | null | undefined
): string | null {
  if (!employee?.id?.trim() || !employee.isActive) return null;
  if (!isSalesCapableEmployeeRole(employee.role)) return null;
  return employee.id;
}

const INVALID_SALES_OWNER_MESSAGE =
  "Sales owner không hợp lệ hoặc đã ngưng hoạt động.";

/** Rejects explicit non-empty owner ids that fail sales-capable validation. */
export function resolveExplicitSalesOwnerId(
  assignedSalesId: string | null | undefined,
  employee: SalesOwnerCandidate | null | undefined
): string | null {
  const raw = assignedSalesId?.trim() || null;
  if (!raw) return null;

  const validated = resolveValidatedSalesOwnerId(
    employee && employee.id === raw ? employee : null
  );
  if (!validated) {
    throw new LeadIntakeValidationError(INVALID_SALES_OWNER_MESSAGE);
  }
  return validated;
}

export function isIntakeSourceRefUniqueViolation(
  error: unknown,
  sourceRef: string | null
): sourceRef is string {
  return !!(
    sourceRef &&
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function shouldCreateOwnerChangeAudit(
  previousOwnerId: string | null,
  nextOwnerId: string | null | undefined
): boolean {
  return nextOwnerId !== undefined && nextOwnerId !== (previousOwnerId ?? null);
}

export function authorizeLeadIntakeRequest(params: {
  authorizationHeader: string | null;
  cronSecretHeader: string | null;
  configuredSecret: string | null | undefined;
}): boolean {
  const secret = params.configuredSecret?.trim();
  if (!secret) return false;

  const auth = params.authorizationHeader ?? "";
  const headerSecret = params.cronSecretHeader ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return bearer === secret || headerSecret === secret;
}
