import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { disableDealerUser } from "@/features/dealer/services/dealer-user.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  try {
    const user = await disableDealerUser(id);
    return NextResponse.json({ user, message: "Đã vô hiệu người dùng đại lý." });
  } catch (err) {
    return dealerApiError(err, "Không thể vô hiệu người dùng đại lý.");
  }
}
