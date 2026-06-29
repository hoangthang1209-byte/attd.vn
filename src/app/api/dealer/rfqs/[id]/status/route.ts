import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError, parseOptionalString } from "@/features/dealer/dealer-api-utils";
import { isValidDealerRFQStatus } from "@/features/dealer/dealer-rfq.validation";
import { updateDealerRFQStatus } from "@/features/dealer/services/dealer-rfq.service";

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

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const status =
    typeof raw.status === "string" && isValidDealerRFQStatus(raw.status) ? raw.status : null;
  if (!status) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  try {
    const rfq = await updateDealerRFQStatus(
      id,
      status,
      raw.note !== undefined ? parseOptionalString(raw.note) : undefined,
    );
    return NextResponse.json({ rfq, message: "Đã cập nhật trạng thái RFQ." });
  } catch (err) {
    return dealerApiError(err, "Không thể cập nhật trạng thái RFQ.");
  }
}
