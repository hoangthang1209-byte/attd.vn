import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { convertDealerRFQToLead } from "@/features/dealer/services/dealer-rfq.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "admin",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  try {
    const rfq = await convertDealerRFQToLead(id);
    return NextResponse.json({ rfq, message: "Đã chuyển RFQ sang Lead CRM." });
  } catch (err) {
    return dealerApiError(err, "Không thể chuyển RFQ sang Lead CRM.");
  }
}
