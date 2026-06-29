import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { linkDealerCompanyToCustomer } from "@/features/dealer/services/dealer-company.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  const customerId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).customerId === "string"
      ? (body as Record<string, string>).customerId.trim()
      : "";

  if (!customerId) {
    return NextResponse.json({ message: "Thiếu mã khách hàng CRM." }, { status: 400 });
  }

  try {
    const company = await linkDealerCompanyToCustomer(id, customerId);
    return NextResponse.json({ company, message: "Đã liên kết khách hàng CRM." });
  } catch (err) {
    return dealerApiError(err, "Không thể liên kết khách hàng CRM.");
  }
}
