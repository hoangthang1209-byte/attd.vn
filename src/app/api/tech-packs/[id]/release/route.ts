import { NextRequest, NextResponse } from "next/server";
import {
  releaseTechPack,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "approve",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pack = await releaseTechPack(
      id,
      auth.session.employeeId ?? auth.session.username,
      auth.session.username,
    );
    return NextResponse.json(pack);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/tech-packs/[id]/release]", err);
    return NextResponse.json({ message: "Không thể phát hành Tech Pack." }, { status: 500 });
  }
}
