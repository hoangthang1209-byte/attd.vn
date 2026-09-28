import "server-only";
import { createHash } from "node:crypto";
import type { LeadSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeLeadEmail, normalizeLeadPhone } from "@/features/crm/lead-identity";
import { createCrmLead, getCrmLeadById } from "@/features/crm/services/crm-lead.service";
import type { CreateCrmLeadInput, CrmLeadRecord } from "@/features/crm/types";

const ACTIVE_STATUSES = ["NEW","CONTACTED","QUALIFIED","NEED_PRICING","QUOTING","QUOTED","NEGOTIATING"] as const;

export function buildDailyLeadIdempotencyKey(input: {
  channel: string;
  source: LeadSource;
  phone?: string | null;
  email?: string | null;
  fingerprint?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const day = now.toISOString().slice(0, 10);
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

export async function ingestCrmLead(input: {
  lead: CreateCrmLeadInput;
  channel: string;
  idempotencyKey?: string | null;
  externalId?: string | null;
  payload?: Prisma.InputJsonValue;
}): Promise<{ lead: CrmLeadRecord; deduplicated: boolean }> {
  const phoneNormalized = normalizeLeadPhone(input.lead.phone);
  const emailNormalized = normalizeLeadEmail(input.lead.email);

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

  const identityOr: Prisma.LeadWhereInput[] = [];
  if (phoneNormalized) {
    identityOr.push({ phoneNormalized });
    identityOr.push({ phone: input.lead.phone?.trim() });
  }
  if (emailNormalized) {
    identityOr.push({ emailNormalized });
    identityOr.push({ email: { equals: input.lead.email?.trim(), mode: "insensitive" } });
  }

  const existing = identityOr.length
    ? await prisma.lead.findFirst({
        where: {
          status: { in: [...ACTIVE_STATUSES] },
          OR: identityOr,
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      })
    : null;

  let leadId = existing?.id ?? null;
  let deduplicated = Boolean(existing);

  if (!leadId) {
    const created = await createCrmLead(input.lead);
    if (!created) throw new Error("Không thể tạo lead.");
    leadId = created.id;
  }

  try {
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          phoneNormalized,
          emailNormalized,
          lastInboundAt: new Date(),
        },
      }),
      prisma.leadInboundEvent.create({
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
      }),
      ...(deduplicated
        ? [prisma.cRMActivity.create({
            data: {
              leadId,
              type: "NOTE",
              title: "Nhận thêm yêu cầu từ cùng khách hàng",
              content: `Nguồn: ${input.channel}`,
            },
          })]
        : []),
    ]);
  } catch (error) {
    if (input.idempotencyKey) {
      const event = await prisma.leadInboundEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { leadId: true },
      });
      if (event) {
        leadId = event.leadId;
        deduplicated = true;
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const result = await getCrmLeadById(leadId);
  if (!result) throw new Error("Không tìm thấy lead sau khi tiếp nhận.");
  return { lead: result, deduplicated };
}
