import { NextRequest, NextResponse } from "next/server";
import {
  selectTechPackPattern,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

/** Sprint 26.3.21 alias for select-pattern */
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const patternId = (body as Record<string, unknown>).patternId;
  if (typeof patternId !== "string" || !patternId.trim()) {
    return NextResponse.json({ message: "Thiếu mã rập." }, { status: 400 });
  }

  try {
    const pack = await selectTechPackPattern(id, patternId.trim());
    return NextResponse.json(pack);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/tech-packs/[id]/attach-pattern]", err);
    return NextResponse.json({ message: "Không thể gắn rập." }, { status: 500 });
  }
}
