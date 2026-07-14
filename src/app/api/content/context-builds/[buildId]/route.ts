import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { toSafeContentContextBuildSummary } from "@/features/content-context/services/content-context.wiring";

type RouteContext = { params: Promise<{ buildId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { buildId } = await context.params;
  const row = await prisma.contentContextBuild.findUnique({ where: { id: buildId } });
  if (!row) {
    return NextResponse.json({ message: "Không tìm thấy build" }, { status: 404 });
  }

  return NextResponse.json({
    build: {
      ...toSafeContentContextBuildSummary(row as never),
      package: row.packageJson,
      sourceManifest: row.sourceManifest,
    },
  });
}
