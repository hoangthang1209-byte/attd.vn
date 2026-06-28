import { NextRequest, NextResponse } from "next/server";
import {
  createTechPackNewVersion,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pack = await createTechPackNewVersion(id);
    return NextResponse.json(pack, { status: 201 });
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/tech-packs/[id]/new-version]", err);
    return NextResponse.json({ message: "Không thể tạo version mới." }, { status: 500 });
  }
}
