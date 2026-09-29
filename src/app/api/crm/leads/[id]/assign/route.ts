import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { getLeadPermissionScope } from "@/features/auth/lead-scope";
import { assignLead } from "@/features/crm/services/crm-lead-assignment.service";
import { getCrmLeadById } from "@/features/crm/services/crm-lead.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

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
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { assignedEmployeeId: true, assignedTo: true },
  });
  if (!lead) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
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
  const employeeId =
    raw.employeeId === null || raw.employeeId === ""
      ? null
      : typeof raw.employeeId === "string"
        ? raw.employeeId
        : undefined;
  if (employeeId === undefined) {
    return NextResponse.json({ message: "Nhân viên phụ trách không hợp lệ" }, { status: 400 });
  }

  const scope = getLeadPermissionScope(permission.session, "leads.update");
  if (scope === "OWN" || scope === "ASSIGNED") {
    const me = permission.session.employeeId;
    const canSelfManage =
      Boolean(me) &&
      employeeId === me &&
      (lead.assignedEmployeeId === null || lead.assignedEmployeeId === me);
    if (!canSelfManage) {
      return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
    }
  }

  try {
    await assignLead({
      leadId: id,
      employeeId,
      actorId: permission.session.userId ?? permission.session.username ?? permission.session.employeeId,
      reason: typeof raw.reason === "string" ? raw.reason : null,
      source: "ADMIN",
    });
    const updated = await getCrmLeadById(id);
    return NextResponse.json({ lead: updated });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể phân công lead" },
      { status: 400 },
    );
  }
}
