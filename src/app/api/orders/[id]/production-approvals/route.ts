import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductionApprovalStatusesForOrderItems } from "@/features/item-production-tracking/production-approval.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id: orderId } = await ctx.params;
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { id: true },
  });
  const map = await getProductionApprovalStatusesForOrderItems(items.map((i) => i.id));
  const statuses: Record<
    string,
    { status: "PENDING" | "NEEDS_REVISION" | "RELEASED"; artworkStale: boolean }
  > = {};
  for (const item of items) {
    const row = map.get(item.id);
    statuses[item.id] = {
      status: row?.status ?? "PENDING",
      artworkStale: row?.artworkStale ?? false,
    };
  }
  return NextResponse.json({ statuses });
}
