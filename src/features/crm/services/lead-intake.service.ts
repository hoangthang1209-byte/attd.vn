import { Prisma, type LeadSource, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLeadCode } from "@/features/crm/crm-code";
import {
  buildIntakeAuditTitle,
  resolveLeadIntakeIdentity,
  resolveValidatedSalesOwnerId,
  sanitizeIntakeMetadata,
  sanitizeSourceRef,
} from "@/features/crm/lead-intake.utils";
import {
  LeadIntakeValidationError,
  type LeadIntakeResult,
  type NormalizedLeadIntakeInput,
} from "@/features/crm/lead-intake.types";
import { getCrmLeadById, isCrmLeadTableReady } from "@/features/crm/services/crm-lead.service";
import { resolveProductInterestSnapshot } from "@/features/crm/services/crm-product-interest-snapshot";
import type { CreateProductInterestInput } from "@/features/crm/types";
import { getEmployeeById } from "@/features/employees/employee.service";

async function validateAssignedSalesId(
  assignedSalesId: string | null | undefined,
  options: { required?: boolean }
): Promise<string | null> {
  const id = assignedSalesId?.trim() || null;
  if (!id) {
    if (options.required) {
      throw new LeadIntakeValidationError("Sales owner id is required.");
    }
    return null;
  }

  const employee = await getEmployeeById(id);
  const validated = resolveValidatedSalesOwnerId(
    employee
      ? { id: employee.id, isActive: employee.isActive, role: employee.role }
      : null
  );
  if (!validated) {
    if (options.required) {
      throw new LeadIntakeValidationError(
        "Sales owner không hợp lệ hoặc đã ngưng hoạt động."
      );
    }
    return null;
  }

  return validated;
}

async function returnExistingLeadBySourceRef(
  source: LeadSource,
  sourceRef: string
): Promise<LeadIntakeResult | null> {
  const existing = await prisma.lead.findFirst({
    where: { source, sourceRef },
  });
  if (!existing) return null;

  await prisma.cRMActivity.create({
    data: {
      leadId: existing.id,
      type: "NOTE",
      title: buildIntakeAuditTitle(false, "source_ref"),
      content: `Nguồn ${source}, sourceRef=${sourceRef}`,
    },
  });

  const lead = await getCrmLeadById(existing.id);
  if (!lead) return null;

  return { lead, created: false, matchedBy: "source_ref" };
}

function collectProductInterests(input: NormalizedLeadIntakeInput): CreateProductInterestInput[] {
  return [
    ...(input.productInterests ?? []),
    ...(input.productInterest ? [input.productInterest] : []),
  ];
}

export async function intakeLead(
  input: NormalizedLeadIntakeInput
): Promise<LeadIntakeResult | null> {
  if (!(await isCrmLeadTableReady())) return null;

  const source = input.source;
  const sourceRef = sanitizeSourceRef(input.sourceRef);
  const identity = resolveLeadIntakeIdentity(input);
  const metadata = sanitizeIntakeMetadata(input.intakeMetadata);
  const assignedTo = await validateAssignedSalesId(input.assignedSalesId, { required: false });
  const receivedAt = input.receivedAt ?? new Date();

  if (sourceRef) {
    const existingResult = await returnExistingLeadBySourceRef(source, sourceRef);
    if (existingResult) return existingResult;
  }

  const interests = collectProductInterests(input);
  const code = await generateLeadCode();

  let row;
  try {
    row = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        ...(input.leadId ? { id: input.leadId } : {}),
        code,
        fullName: identity.fullName,
        contactName: identity.contactName,
        companyName: identity.companyName,
        phone: identity.phone,
        email: identity.email,
        zalo: input.zalo?.trim() || null,
        company: identity.companyName,
        source,
        sourceRef,
        sourceDetail: input.sourceDetail?.trim() || null,
        receivedAt,
        intakeMetadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        demand: input.demand?.trim() || input.message?.trim() || null,
        message: input.message?.trim() || null,
        note: input.note?.trim() || null,
        status: input.status ?? "NEW",
        priority: input.priority ?? "NORMAL",
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        followUpAt: input.nextFollowUpAt ?? null,
        estimatedValue: input.estimatedValue ?? null,
        assignedTo,
        landingPage: input.landingPage?.trim() || null,
        utmSource: input.utmSource?.trim() || null,
        utmMedium: input.utmMedium?.trim() || null,
        utmCampaign: input.utmCampaign?.trim() || null,
        referrer: input.referrer?.trim() || null,
      },
    });

    if (interests.length > 0) {
      for (const interest of interests) {
        const productNameSnapshot = await resolveProductInterestSnapshot(interest);
        await tx.cRMProductInterest.create({
          data: {
            leadId: created.id,
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

    await tx.cRMActivity.create({
      data: {
        leadId: created.id,
        type: "NOTE",
        title: buildIntakeAuditTitle(true, "new"),
        content: [
          `Kênh: ${input.channel}`,
          `Nguồn: ${source}`,
          sourceRef ? `sourceRef=${sourceRef}` : null,
          assignedTo ? `Phụ trách: ${assignedTo}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    });

    return created;
    });
  } catch (err) {
    if (
      sourceRef &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const raced = await returnExistingLeadBySourceRef(source, sourceRef);
      if (raced) return raced;
    }
    throw err;
  }

  const lead = await getCrmLeadById(row.id);
  if (!lead) return null;

  return { lead, created: true, matchedBy: "new" };
}

export type GmailLeadIntakeInput = {
  messageId: string;
  threadId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  subject?: string | null;
  bodySnippet?: string | null;
  receivedAt?: string | Date | null;
  assignedSalesId?: string | null;
  intakeMetadata?: Record<string, unknown> | null;
};

export async function intakeLeadFromGmail(
  input: GmailLeadIntakeInput
): Promise<LeadIntakeResult | null> {
  const messageId = sanitizeSourceRef(input.messageId);
  if (!messageId) {
    throw new LeadIntakeValidationError("Gmail message id is required.");
  }

  const receivedAt =
    input.receivedAt instanceof Date
      ? input.receivedAt
      : input.receivedAt
        ? new Date(input.receivedAt)
        : new Date();

  if (Number.isNaN(receivedAt.getTime())) {
    throw new LeadIntakeValidationError("receivedAt không hợp lệ.");
  }

  const contactName = input.senderName?.trim() || input.senderEmail?.trim() || null;
  const messageParts = [input.subject?.trim(), input.bodySnippet?.trim()].filter(Boolean);

  return intakeLead({
    channel: "GMAIL",
    source: "GMAIL",
    sourceRef: messageId,
    receivedAt,
    contactName,
    email: input.senderEmail?.trim() || null,
    message: messageParts.length > 0 ? messageParts.join("\n\n") : null,
    assignedSalesId: input.assignedSalesId,
    intakeMetadata: {
      ...(input.intakeMetadata ?? {}),
      gmailThreadId: input.threadId?.trim() || null,
    },
  });
}

export async function validateLeadOwnerId(ownerId: string | null | undefined): Promise<string | null> {
  return validateAssignedSalesId(ownerId, { required: false });
}

export async function validateLeadOwnerIdStrict(ownerId: string): Promise<string> {
  const result = await validateAssignedSalesId(ownerId, { required: true });
  return result!;
}

export function isValidIntakeSource(value: string): value is LeadSource {
  return [
    "WEBSITE",
    "GMAIL",
    "MANUAL",
    "CONTACT",
    "DEALER",
    "OEM",
    "SOURCING",
    "LANDING_PAGE",
    "PRODUCT_INQUIRY",
    "OTHER",
  ].includes(value);
}

export { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";

export function mapOperationalStatusLabel(status: LeadStatus): string {
  const labels: Partial<Record<LeadStatus, string>> = {
    NEW: "Mới",
    CONTACTED: "Đang liên hệ",
    QUALIFIED: "Đã tư vấn",
    QUOTED: "Đã báo giá",
    QUOTING: "Đang báo giá",
    NEGOTIATING: "Theo dõi",
    WON: "Chốt",
    LOST: "Mất",
  };
  return labels[status] ?? status;
}
