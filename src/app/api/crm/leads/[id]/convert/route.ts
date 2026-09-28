import { NextRequest, NextResponse } from "next/server";
import { convertLeadToCustomer } from "@/features/crm/services/crm-lead.service";
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
    select: { assignedEmployeeId: true },
  });
  if (!scopeRow) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
  }
  if (!canAccessLeadRecord(permission.session, scopeRow, "leads.update")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }
  const lead = await convertLeadToCustomer(id);

  if (!lead) {
    return NextResponse.json(
      { message: "Không thể chuyển lead. Lead có thể đã được chuyển hoặc không tồn tại." },
      { status: 400 }
    );
  }

  return NextResponse.json({ lead });
}
