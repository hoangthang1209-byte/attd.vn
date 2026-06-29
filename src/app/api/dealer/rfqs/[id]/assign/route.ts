import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { assignDealerRFQ } from "@/features/dealer/services/dealer-rfq.service";

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

  const adminUserId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).adminUserId === "string"
      ? (body as Record<string, string>).adminUserId
      : null;

  try {
    const rfq = await assignDealerRFQ(id, adminUserId || null);
    return NextResponse.json({ rfq, message: "Đã gán người phụ trách." });
  } catch (err) {
    return dealerApiError(err, "Không thể gán người phụ trách.");
  }
}
