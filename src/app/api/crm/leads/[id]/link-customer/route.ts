import { NextRequest, NextResponse } from "next/server";
import { linkLeadToExistingCustomer } from "@/features/crm/services/crm-lead.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { prisma } from "@/lib/prisma";
import { can } from "@/features/auth/admin-permissions";
import { canAccessLeadRecord } from "@/features/auth/lead-scope";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "leads.update")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { id } = await context.params;
  const scopeRow = await prisma.lead.findUnique({
    where: { id },
    select: { assignedEmployeeId: true, assignedTo: true },
  });
  if (!scopeRow) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
  }
  if (!canAccessLeadRecord(permission.session, scopeRow, "leads.update")) {
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
  const customerId = typeof raw.customerId === "string" ? raw.customerId.trim() : "";

  if (!customerId) {
    return NextResponse.json({ message: "Vui lòng chọn khách hàng" }, { status: 400 });
  }

  const lead = await linkLeadToExistingCustomer(id, {
    customerId,
    createContact: raw.createContact !== false,
    contactId: typeof raw.contactId === "string" ? raw.contactId : null,
  });

  if (!lead) {
    return NextResponse.json(
      {
        message:
          "Không thể gắn lead. Lead có thể đã được liên kết hoặc khách hàng không tồn tại.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ lead });
}
