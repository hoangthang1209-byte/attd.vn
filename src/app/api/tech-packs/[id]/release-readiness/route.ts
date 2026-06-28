import { NextRequest, NextResponse } from "next/server";
import { getTechPackReleaseReadiness } from "@/features/tech-pack/tech-pack.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const readiness = await getTechPackReleaseReadiness(id);
    return NextResponse.json(readiness);
  } catch (err) {
    console.error("[GET /api/tech-packs/[id]/release-readiness]", err);
    return NextResponse.json({ message: "Không thể kiểm tra điều kiện phát hành." }, { status: 500 });
  }
}
