import { NextRequest, NextResponse } from "next/server";
import { evaluateOrderMaterialAvailability } from "@/features/materials/material-availability.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const rows = await evaluateOrderMaterialAvailability(id);
  return NextResponse.json({ rows });
}
