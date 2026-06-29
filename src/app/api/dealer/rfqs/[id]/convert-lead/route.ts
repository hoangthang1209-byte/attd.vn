import { NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { convertDealerRFQToLead } from "@/features/dealer/services/dealer-rfq.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  try {
    const rfq = await convertDealerRFQToLead(id);
    return NextResponse.json({ rfq, message: "Đã chuyển RFQ sang Lead CRM." });
  } catch (err) {
    return dealerApiError(err, "Không thể chuyển RFQ sang Lead CRM.");
  }
}
