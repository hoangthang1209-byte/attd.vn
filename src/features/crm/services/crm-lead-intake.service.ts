import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLeadCode } from "@/features/crm/crm-code";
import { normalizeLeadEmail, normalizeLeadPhone } from "@/features/crm/lead-identity";
import { resolveProductInterestSnapshot } from "@/features/crm/services/crm-product-interest-snapshot";
import { getCrmLeadById } from "@/features/crm/services/crm-lead.service";
import { autoAssignLead } from "@/features/crm/services/crm-lead-assignment.service";
import type { CreateCrmLeadInput, CreateProductInterestInput, CrmLeadRecord } from "@/features/crm/types";

const ACTIVE_STATUSES = ["NEW","CONTACTED","QUALIFIED","NEED_PRICING","QUOTING","QUOTED","NEGOTIATING"] as const;

export class LeadIntakeRateLimitError extends Error {
  constructor() {
    super("Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.");
    this.name = "LeadIntakeRateLimitError";
  }
}

export async function assertLeadIntakeRateLimit(input: {
  phone?: string | null;
  email?: string | null;
  windowMinutes?: number;
  maxEvents?: number;
}) {
  const phoneNormalized = normalizeLeadPhone(input.phone);
  const emailNormalized = normalizeLeadEmail(input.email);
  if (!phoneNormalized && !emailNormalized) return;

  const cutoff = new Date(Date.now() - (input.windowMinutes ?? 10) * 60_000);
  const identity: Prisma.LeadInboundEventWhereInput[] = [];
  if (phoneNormalized) identity.push({ phoneNormalized });
  if (emailNormalized) identity.push({ emailNormalized });
  const count = await prisma.leadInboundEvent.count({
    where: { receivedAt: { gte: cutoff }, OR: identity },
  });
  if (count >= (input.maxEvents ?? 5)) throw new LeadIntakeRateLimitError();
}

export function buildDailyLeadIdempotencyKey(input: {
  channel: string;
  source: LeadSource;
  phone?: string | null;
  email?: string | null;
  fingerprint?: string | null;
  now?: Date;
}) {
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  const raw = [
    input.channel,
    input.source,
    normalizeLeadPhone(input.phone) ?? "",
    normalizeLeadEmail(input.email) ?? "",
    input.fingerprint ?? "",
    day,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

function resolveIdentity(input: CreateCrmLeadInput) {
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

function identityKeys(phoneNormalized: string | null, emailNormalized: string | null) {
  return [
    ...(phoneNormalized ? [`phone:${phoneNormalized}`] : []),
    ...(emailNormalized ? [`email:${emailNormalized}`] : []),
  ];
}

async function prepareInterests(input: CreateCrmLeadInput) {
  const interests = [
    ...(input.productInterests ?? []),
    ...(input.productInterest ? [input.productInterest] : []),
  ].filter((item) =>
    Boolean(
      item.productId ||
      item.productNameSnapshot?.trim() ||
      item.quantity ||
      item.requirementNote?.trim(),
    ),
  );
  return Promise.all(
    interests.map(async (interest) => ({
      interest,
      snapshot: await resolveProductInterestSnapshot(interest),
    })),
  );
}

async function appendInboundToLead(
  leadId: string,
  input: {
    lead: CreateCrmLeadInput;
    channel: string;
    idempotencyKey?: string | null;
    externalId?: string | null;
    payload?: Prisma.InputJsonValue;
  },
  phoneNormalized: string | null,
  emailNormalized: string | null,
  preparedInterests: Array<{ interest: CreateProductInterestInput; snapshot: string | null }>,
) {
  const keys = identityKeys(phoneNormalized, emailNormalized);
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { phoneNormalized, emailNormalized, lastInboundAt: new Date() },
    });
    for (const key of keys) {
      await tx.leadIdentityKey.upsert({
        where: { key },
        create: { key, leadId },
        update: {},
      });
    }
    await tx.leadInboundEvent.create({
      data: {
        leadId,
        source: input.lead.source ?? "WEBSITE",
        channel: input.channel,
        externalId: input.externalId?.trim() || null,
        idempotencyKey: input.idempotencyKey?.trim() || null,
        phoneNormalized,
        emailNormalized,
        payload: input.payload,
      },
    });
    for (const item of preparedInterests) {
      await tx.cRMProductInterest.create({
        data: {
          leadId,
          productId: item.interest.productId ?? null,
          variantId: item.interest.variantId ?? null,
          productNameSnapshot: item.snapshot,
          quantity: item.interest.quantity ?? null,
          unit: item.interest.unit?.trim() || "cái",
          requirementNote: item.interest.requirementNote?.trim() || null,
          serviceNeeds: item.interest.serviceNeeds ?? undefined,
        },
      });
    }
    await tx.cRMActivity.create({
      data: {
        leadId,
        type: "NOTE",
        title: "Nhận thêm yêu cầu từ cùng khách hàng",
        content: [
          `Nguồn: ${input.channel}`,
          input.lead.demand?.trim() ? `Nhu cầu: ${input.lead.demand.trim()}` : null,
          input.lead.note?.trim() ? `Ghi chú: ${input.lead.note.trim()}` : null,
        ].filter(Boolean).join("\n"),
      },
    });
  });
}

export async function ingestCrmLead(input: {
  lead: CreateCrmLeadInput;
  channel: string;
  idempotencyKey?: string | null;
  externalId?: string | null;
  payload?: Prisma.InputJsonValue;
  dedupeByIdentity?: boolean;
}): Promise<{ lead: CrmLeadRecord; deduplicated: boolean }> {
  const identity = resolveIdentity(input.lead);
  const phoneNormalized = normalizeLeadPhone(identity.phone);
  const emailNormalized = normalizeLeadEmail(identity.email);
  const keys = input.dedupeByIdentity === false
    ? []
    : identityKeys(phoneNormalized, emailNormalized);
  const preparedInterests = await prepareInterests(input.lead);

  if (input.idempotencyKey) {
    const event = await prisma.leadInboundEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { leadId: true },
    });
    if (event) {
      const existing = await getCrmLeadById(event.leadId);
      if (existing) return { lead: existing, deduplicated: true };
    }
  }

  let existingLeadId: string | null = null;
  if (keys.length) {
    const claimed = await prisma.leadIdentityKey.findFirst({
      where: {
        key: { in: keys },
        lead: { status: { in: [...ACTIVE_STATUSES] } },
      },
      select: { leadId: true },
    });
    existingLeadId = claimed?.leadId ?? null;
  }

  if (!existingLeadId && input.dedupeByIdentity !== false) {
    const identityOr: Prisma.LeadWhereInput[] = [];
    if (phoneNormalized) {
      identityOr.push({ phoneNormalized });
      if (input.lead.phone?.trim()) identityOr.push({ phone: input.lead.phone.trim() });
    }
    if (emailNormalized) {
      identityOr.push({ emailNormalized });
      if (input.lead.email?.trim()) {
        identityOr.push({ email: { equals: input.lead.email.trim(), mode: "insensitive" } });
      }
    }
    if (identityOr.length) {
      const existing = await prisma.lead.findFirst({
        where: { status: { in: [...ACTIVE_STATUSES] }, OR: identityOr },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      existingLeadId = existing?.id ?? null;
    }
  }

  if (!existingLeadId && keys.length) {
    await prisma.leadIdentityKey.deleteMany({
      where: {
        key: { in: keys },
        lead: { status: { notIn: [...ACTIVE_STATUSES] } },
      },
    });
  }

  if (existingLeadId) {
    try {
      await appendInboundToLead(
        existingLeadId,
        input,
        phoneNormalized,
        emailNormalized,
        preparedInterests,
      );
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
    const result = await getCrmLeadById(existingLeadId);
    if (!result) throw new Error("Không tìm thấy lead sau khi tiếp nhận.");
    return { lead: result, deduplicated: true };
  }

  const code = await generateLeadCode();
  try {
    const leadId = await prisma.$transaction(async (tx) => {
      const row = await tx.lead.create({
        data: {
          ...(input.lead.id ? { id: input.lead.id } : {}),
          code,
          fullName: identity.fullName,
          contactName: identity.contactName,
          companyName: identity.companyName,
          phone: identity.phone,
          phoneNormalized,
          email: identity.email,
          emailNormalized,
          zalo: input.lead.zalo?.trim() || null,
          company: identity.companyName,
          source: input.lead.source ?? "WEBSITE",
          sourceDetail: input.lead.sourceDetail?.trim() || null,
          demand: input.lead.demand?.trim() || input.lead.message?.trim() || null,
          message: input.lead.message?.trim() || null,
          note: input.lead.note?.trim() || null,
          status: input.lead.status ?? "NEW",
          priority: input.lead.priority ?? "NORMAL",
          nextFollowUpAt: input.lead.nextFollowUpAt ?? input.lead.followUpAt ?? null,
          followUpAt: null,
          estimatedValue: input.lead.estimatedValue ?? null,
          assignedTo: input.lead.assignedTo?.trim() || null,
          landingPage: input.lead.landingPage?.trim() || null,
          utmSource: input.lead.utmSource?.trim() || null,
          utmMedium: input.lead.utmMedium?.trim() || null,
          utmCampaign: input.lead.utmCampaign?.trim() || null,
          referrer: input.lead.referrer?.trim() || null,
          lastInboundAt: new Date(),
        },
      });
      for (const key of keys) {
        await tx.leadIdentityKey.create({ data: { key, leadId: row.id } });
      }
      for (const item of preparedInterests) {
        await tx.cRMProductInterest.create({
          data: {
            leadId: row.id,
            productId: item.interest.productId ?? null,
            variantId: item.interest.variantId ?? null,
            productNameSnapshot: item.snapshot,
            quantity: item.interest.quantity ?? null,
            unit: item.interest.unit?.trim() || "cái",
            requirementNote: item.interest.requirementNote?.trim() || null,
            serviceNeeds: item.interest.serviceNeeds ?? undefined,
          },
        });
      }
      await tx.leadInboundEvent.create({
        data: {
          leadId: row.id,
          source: input.lead.source ?? "WEBSITE",
          channel: input.channel,
          externalId: input.externalId?.trim() || null,
          idempotencyKey: input.idempotencyKey?.trim() || null,
          phoneNormalized,
          emailNormalized,
          payload: input.payload,
        },
      });
      return row.id;
    });

    await autoAssignLead(leadId);
    const result = await getCrmLeadById(leadId);
    if (!result) throw new Error("Không tìm thấy lead sau khi tiếp nhận.");
    return { lead: result, deduplicated: false };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }

    const event = input.idempotencyKey
      ? await prisma.leadInboundEvent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { leadId: true },
        })
      : null;
    const claimed = !event && keys.length
      ? await prisma.leadIdentityKey.findFirst({
          where: {
            key: { in: keys },
            lead: { status: { in: [...ACTIVE_STATUSES] } },
          },
          select: { leadId: true },
        })
      : null;
    const winnerLeadId = event?.leadId ?? claimed?.leadId;
    if (!winnerLeadId) throw error;

    if (!event) {
      await appendInboundToLead(
        winnerLeadId,
        input,
        phoneNormalized,
        emailNormalized,
        preparedInterests,
      );
    }
    const result = await getCrmLeadById(winnerLeadId);
    if (!result) throw new Error("Không tìm thấy lead sau khi xử lý trùng.");
    return { lead: result, deduplicated: true };
  }
}
