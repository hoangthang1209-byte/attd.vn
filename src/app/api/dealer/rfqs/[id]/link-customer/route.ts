import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { linkDealerRFQToCustomer } from "@/features/dealer/services/dealer-rfq.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "admin",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  const customerId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).customerId === "string"
      ? (body as Record<string, string>).customerId
      : "";

  if (!customerId) {
    return NextResponse.json({ message: "Thiếu mã khách hàng CRM." }, { status: 400 });
  }

  try {
    const rfq = await linkDealerRFQToCustomer(id, customerId);
    return NextResponse.json({ rfq, message: "Đã liên kết khách hàng CRM." });
  } catch (err) {
    return dealerApiError(err, "Không thể liên kết khách hàng CRM.");
  }
}
