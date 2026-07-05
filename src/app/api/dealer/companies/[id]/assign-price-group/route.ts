import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { assignDealerPriceGroup } from "@/features/dealer/services/dealer-company.service";

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

  const priceGroupId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).priceGroupId === "string"
      ? (body as Record<string, string>).priceGroupId.trim()
      : "";

  if (!priceGroupId) {
    return NextResponse.json({ message: "Thiếu nhóm giá." }, { status: 400 });
  }

  try {
    const company = await assignDealerPriceGroup(id, priceGroupId);
    return NextResponse.json({ company, message: "Đã gán nhóm giá." });
  } catch (err) {
    return dealerApiError(err, "Không thể gán nhóm giá.");
  }
}
