import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getBatchHistory } from "@/features/item-production-tracking/item-production-batch.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ batchId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { batchId } = await ctx.params;
  const history = await getBatchHistory(batchId);
  return NextResponse.json(history);
}
