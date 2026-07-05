import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { rejectDealerCompany } from "@/features/dealer/services/dealer-company.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "approve",
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

  const reason =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).reason === "string"
      ? (body as Record<string, string>).reason
      : "";

  try {
    const company = await rejectDealerCompany(id, reason);
    return NextResponse.json({ company, message: "Đã từ chối đại lý." });
  } catch (err) {
    return dealerApiError(err, "Không thể từ chối đại lý.");
  }
}
