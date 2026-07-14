import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { toSafeContentContextBuildSummary } from "@/features/content-context/services/content-context.wiring";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const rows = await prisma.contentContextBuild.findMany({
    where: { topicId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    builds: rows.map((row) => toSafeContentContextBuildSummary(row as never)),
  });
}
