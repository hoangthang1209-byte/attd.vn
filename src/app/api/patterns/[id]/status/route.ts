import { NextRequest, NextResponse } from "next/server";
import { PatternStatus } from "@prisma/client";
import { PatternValidationError, setPatternStatus } from "@/features/patterns/pattern.service";
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
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const status = typeof raw.status === "string" ? raw.status : "";
  if (!Object.values(PatternStatus).includes(status as PatternStatus)) {
    return NextResponse.json({ message: "Trạng thái rập không hợp lệ." }, { status: 400 });
  }

  try {
    const pattern = await setPatternStatus(
      id,
      status as PatternStatus,
      auth.session.username ?? auth.session.employeeId,
    );
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns/[id]/status]", err);
    return NextResponse.json({ message: "Không thể đổi trạng thái rập." }, { status: 500 });
  }
}
