import { NextRequest, NextResponse } from "next/server";
import { listWarehouseHistory } from "@/features/materials/warehouse.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const history = await listWarehouseHistory(id);
  return NextResponse.json({ history });
}
