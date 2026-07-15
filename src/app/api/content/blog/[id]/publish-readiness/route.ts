import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getContentPublishReadiness } from "@/features/content/services/content-publish-readiness.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const readiness = await getContentPublishReadiness(id);
  return NextResponse.json({
    readiness,
    message: "Publish readiness only — sprint này không publish.",
  });
}
