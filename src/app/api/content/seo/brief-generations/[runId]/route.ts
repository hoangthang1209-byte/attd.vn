import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { toSafeGenerationRunDetail } from "@/features/content/services/seo-brief-ai.wiring";
import type { AiGenerationRunRecord } from "@/features/content/services/seo-brief-generator.service";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { runId } = await context.params;
  const run = await prisma.aiGenerationRun.findUnique({ where: { id: runId } });
  if (!run || run.type !== "SEO_BRIEF") {
    return NextResponse.json({ message: "Không tìm thấy generation run." }, { status: 404 });
  }

  return NextResponse.json({
    run: toSafeGenerationRunDetail(run as AiGenerationRunRecord),
  });
}
