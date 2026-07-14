import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { toSafeGenerationRunMetadata } from "@/features/content/services/seo-brief-ai.wiring";
import type { AiGenerationRunRecord } from "@/features/content/services/seo-brief-generator.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const runs = await prisma.aiGenerationRun.findMany({
    where: {
      type: "SEO_BRIEF",
      entityType: "SEO_TOPIC",
      entityId: id,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    topicId: id,
    runs: runs.map((run) => toSafeGenerationRunMetadata(run as AiGenerationRunRecord)),
  });
}
