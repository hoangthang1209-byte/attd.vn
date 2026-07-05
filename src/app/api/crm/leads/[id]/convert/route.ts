import { NextRequest, NextResponse } from "next/server";
import { convertLeadToCustomer } from "@/features/crm/services/crm-lead.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const lead = await convertLeadToCustomer(id);

  if (!lead) {
    return NextResponse.json(
      { message: "Không thể chuyển lead. Lead có thể đã được chuyển hoặc không tồn tại." },
      { status: 400 }
    );
  }

  return NextResponse.json({ lead });
}
