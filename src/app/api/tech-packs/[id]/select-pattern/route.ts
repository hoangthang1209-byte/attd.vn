import { NextRequest, NextResponse } from "next/server";
import {
  selectTechPackPattern,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


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
    console.error("[POST /api/tech-packs/[id]/select-pattern]", err);
    return NextResponse.json({ message: "Không thể chọn rập." }, { status: 500 });
  }
}
