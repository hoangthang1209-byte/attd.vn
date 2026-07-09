import { NextRequest, NextResponse } from "next/server";
import { getSalesFollowUpCenter } from "@/features/sales/follow-up/follow-up.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const result = await getSalesFollowUpCenter();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/sales/follow-up]", err);
    return NextResponse.json({ message: "Không thể tải trung tâm follow-up" }, { status: 500 });
  }
}
