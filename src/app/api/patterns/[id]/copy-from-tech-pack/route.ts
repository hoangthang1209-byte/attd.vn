import { NextRequest, NextResponse } from "next/server";
import { copyTechPackMeasurementsToPattern } from "@/features/measurement-template/measurement-template.service";
import { PatternValidationError } from "@/features/patterns/pattern.service";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as { techPackId?: string };
    if (!body.techPackId) {
      return NextResponse.json({ message: "Thiếu Tech Pack." }, { status: 400 });
    }
    const pattern = await copyTechPackMeasurementsToPattern(id, body.techPackId);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError || err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns/[id]/copy-from-tech-pack]", err);
    return NextResponse.json({ message: "Không thể sao chép từ Tech Pack." }, { status: 500 });
  }
}
