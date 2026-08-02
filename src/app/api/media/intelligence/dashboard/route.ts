import { NextResponse } from "next/server";
import { getMediaDashboardSnapshot } from "@/features/media/intelligence/dashboard.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const snapshot = await getMediaDashboardSnapshot();
  return NextResponse.json(snapshot);
}
