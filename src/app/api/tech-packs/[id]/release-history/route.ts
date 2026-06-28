import { NextRequest, NextResponse } from "next/server";
import { getTechPackReleaseHistory } from "@/features/tech-pack/tech-pack.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const items = await getTechPackReleaseHistory(id);
  return NextResponse.json({ items });
}
