import { NextResponse } from "next/server";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { submitDealerRFQ } from "@/features/dealer/services/dealer-rfq.service";
import { requireDealerPermission } from "@/lib/permissions/require-dealer-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const permission = await requireDealerPermission({
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const rfq = await submitDealerRFQ(id, { dealerCompanyId: permission.session.companyId });
    return NextResponse.json({ rfq, message: "Đã gửi yêu cầu báo giá." });
  } catch (err) {
    return dealerApiError(err, "Không thể gửi RFQ.");
  }
}
