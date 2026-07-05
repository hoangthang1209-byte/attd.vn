import { NextRequest, NextResponse } from "next/server";
import type { CRMActivityType } from "@prisma/client";
import { createCRMActivity } from "@/features/crm/services/crm-activity.service";
import { CRM_ACTIVITY_TYPES } from "@/features/crm/types";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function isValidActivityType(value: string): value is CRMActivityType {
  return CRM_ACTIVITY_TYPES.includes(value as CRMActivityType);
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

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
  const leadId = typeof raw.leadId === "string" ? raw.leadId : null;
  const customerId = typeof raw.customerId === "string" ? raw.customerId : null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";

  if (!leadId && !customerId) {
    return NextResponse.json(
      { message: "Cần leadId hoặc customerId" },
      { status: 400 }
    );
  }
  if (!title) {
    return NextResponse.json({ message: "Tiêu đề là bắt buộc" }, { status: 400 });
  }

  const type =
    typeof raw.type === "string" && isValidActivityType(raw.type) ? raw.type : "NOTE";

  const nextFollowUpAt =
    typeof raw.nextFollowUpAt === "string" && raw.nextFollowUpAt
      ? new Date(raw.nextFollowUpAt)
      : null;
  if (nextFollowUpAt && Number.isNaN(nextFollowUpAt.getTime())) {
    return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
  }

  const activity = await createCRMActivity({
    leadId,
    customerId,
    contactId: typeof raw.contactId === "string" ? raw.contactId : null,
    type,
    title,
    content: typeof raw.content === "string" ? raw.content : null,
    outcome: typeof raw.outcome === "string" ? raw.outcome : null,
    nextFollowUpAt,
  });

  if (!activity) {
    return NextResponse.json({ message: "Không thể tạo hoạt động" }, { status: 500 });
  }

  return NextResponse.json({ activity }, { status: 201 });
}
