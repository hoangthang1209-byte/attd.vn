import { NextRequest, NextResponse } from "next/server";
import {
  createPatternNewVersion,
} from "@/features/patterns/pattern-versioning";
import { PatternValidationError } from "@/features/patterns/pattern.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    const pattern = await createPatternNewVersion(
      id,
      auth.session.employeeId ?? auth.session.username ?? null,
    );
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns/[id]/new-version]", err);
    return NextResponse.json({ message: "Không thể tạo phiên bản rập mới." }, { status: 500 });
  }
}
