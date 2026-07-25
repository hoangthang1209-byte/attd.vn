import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStageHistory } from "@/features/item-production-tracking/item-production.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const stage = await prisma.itemProductionStage.findUnique({
    where: { id },
    include: {
      productionItem: {
        select: { id: true, rowVersion: true },
      },
    },
  });
  if (!stage) return NextResponse.json({ message: "Không tìm thấy công đoạn" }, { status: 404 });
  const history = await getStageHistory(id);
  return NextResponse.json({
    stage,
    productionItemId: stage.productionItemId,
    history,
  });
}
