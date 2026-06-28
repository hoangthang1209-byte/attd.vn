import { NextRequest, NextResponse } from "next/server";
import { getTechPackDiff } from "@/features/tech-pack/tech-pack.service";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const diff = await getTechPackDiff(id);
    return NextResponse.json(diff);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 404 });
    }
    console.error("[GET /api/tech-packs/[id]/diff]", err);
    return NextResponse.json({ message: "Không thể so sánh thay đổi." }, { status: 500 });
  }
}
