import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getContentLaunchChecklist } from "@/features/content/services/content-launch-checklist.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const checklist = await getContentLaunchChecklist();
    return NextResponse.json(checklist);
  } catch (err) {
    console.error("[GET /api/content/launch/checklist]", err);
    return NextResponse.json({ message: "Không tải được checklist" }, { status: 500 });
  }
}
