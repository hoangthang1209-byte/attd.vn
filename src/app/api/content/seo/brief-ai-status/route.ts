import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getSeoBriefAiSafeStatus } from "@/features/ai/ai-seo-brief-config";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  return NextResponse.json({ status: getSeoBriefAiSafeStatus() });
}
