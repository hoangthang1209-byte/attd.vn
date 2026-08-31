import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBatchStageHistory } from "@/features/item-production-tracking/item-production-batch.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ batchId: string; stageId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { stageId } = await ctx.params;
  const stage = await prisma.itemProductionBatchStage.findUnique({
    where: { id: stageId },
    include: { batch: { select: { id: true, code: true, itemProductionTrackingId: true } } },
  });
  if (!stage) return NextResponse.json({ message: "Không tìm thấy công đoạn" }, { status: 404 });
  const history = await getBatchStageHistory(stageId);
  return NextResponse.json({
    stage,
    batchId: stage.batchId,
    productionItemId: stage.batch.itemProductionTrackingId,
    history,
  });
}
