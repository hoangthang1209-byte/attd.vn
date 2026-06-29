import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import { listDealerActivities } from "@/features/dealer/services/dealer-activity.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? undefined) || undefined;

  try {
    const result = await listDealerActivities(id, limit);
    return NextResponse.json(result);
  } catch (err) {
    return dealerApiError(err, "Không thể tải hoạt động đại lý.");
  }
}
