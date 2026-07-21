import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getFirstLaunchArticleSnapshot } from "@/features/content/services/content-launch-setup.service";
import { resolveContentLaunchWorkflowSteps } from "@/features/content/services/content-launch-workflow.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const [article, workflow] = await Promise.all([
      getFirstLaunchArticleSnapshot(),
      resolveContentLaunchWorkflowSteps(),
    ]);
    return NextResponse.json({ article, workflow });
  } catch (err) {
    console.error("[GET /api/content/launch/first-article]", err);
    return NextResponse.json({ message: "Không tải được first article" }, { status: 500 });
  }
}
