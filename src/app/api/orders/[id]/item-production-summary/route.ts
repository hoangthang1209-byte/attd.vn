import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOrderProductionSummary } from "@/features/item-production-tracking/item-production.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const summary = await getOrderProductionSummary(id);
  return NextResponse.json({ summary });
}
