import { NextRequest, NextResponse } from "next/server";
import type { LeadSource } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { isValidLeadSource } from "@/features/crm/services/crm-lead.service";
import { ingestCrmLead } from "@/features/crm/services/crm-lead-intake.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "leads.create")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const sourceRaw = typeof raw.source === "string" ? raw.source : "OTHER";
  if (!isValidLeadSource(sourceRaw)) {
    return NextResponse.json({ message: "Nguồn lead không hợp lệ" }, { status: 400 });
  }
  const channel = typeof raw.channel === "string" ? raw.channel.trim() : "";
  if (!channel) {
    return NextResponse.json({ message: "Channel là bắt buộc" }, { status: 400 });
  }

  const lead = raw.lead && typeof raw.lead === "object"
    ? raw.lead as Record<string, unknown>
    : raw;

  try {
    const result = await ingestCrmLead({
      lead: {
        source: sourceRaw as LeadSource,
        sourceDetail: typeof lead.sourceDetail === "string" ? lead.sourceDetail : null,
        fullName: typeof lead.fullName === "string" ? lead.fullName : undefined,
        contactName: typeof lead.contactName === "string" ? lead.contactName : null,
        companyName: typeof lead.companyName === "string" ? lead.companyName : null,
        phone: typeof lead.phone === "string" ? lead.phone : undefined,
        email: typeof lead.email === "string" ? lead.email : null,
        zalo: typeof lead.zalo === "string" ? lead.zalo : null,
        demand: typeof lead.demand === "string" ? lead.demand : null,
        message: typeof lead.message === "string" ? lead.message : null,
        note: typeof lead.note === "string" ? lead.note : null,
      },
      channel,
      externalId: typeof raw.externalId === "string" ? raw.externalId : null,
      idempotencyKey: typeof raw.idempotencyKey === "string" ? raw.idempotencyKey : null,
      dedupeByIdentity: raw.dedupeByIdentity !== false,
      payload: JSON.parse(JSON.stringify(raw)),
    });
    return NextResponse.json(result, { status: result.deduplicated ? 200 : 201 });
  } catch (error) {
    console.error("[POST /api/crm/leads/intake]", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tiếp nhận lead" },
      { status: 400 },
    );
  }
}
