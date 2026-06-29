import { NextResponse } from "next/server";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { submitDealerRFQ } from "@/features/dealer/services/dealer-rfq.service";
import { requireApprovedDealerPortalFromCookies } from "@/lib/dealer-auth/require-dealer-portal";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireApprovedDealerPortalFromCookies();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const rfq = await submitDealerRFQ(id, { dealerCompanyId: auth.session.companyId });
    return NextResponse.json({ rfq, message: "Đã gửi yêu cầu báo giá." });
  } catch (err) {
    return dealerApiError(err, "Không thể gửi RFQ.");
  }
}
