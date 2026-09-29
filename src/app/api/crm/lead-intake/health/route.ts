import { NextRequest, NextResponse } from "next/server";
import { getLeadIntakeHealthReport } from "@/features/crm/services/lead-intake-health.service";
import { assertCanViewCrmLeads } from "@/features/crm/services/crm-lead-access";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  try {
    assertCanViewCrmLeads(session);
  } catch {
    return NextResponse.json(
      { message: "Bạn không có quyền xem CRM lead intake." },
      { status: 403 }
    );
  }

  const report = await getLeadIntakeHealthReport();
  return NextResponse.json(report);
}
