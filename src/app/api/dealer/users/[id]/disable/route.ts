import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { disableDealerUser } from "@/features/dealer/services/dealer-user.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  try {
    const user = await disableDealerUser(id);
    return NextResponse.json({ user, message: "Đã vô hiệu người dùng đại lý." });
  } catch (err) {
    return dealerApiError(err, "Không thể vô hiệu người dùng đại lý.");
  }
}
