import { NextRequest, NextResponse } from "next/server";
import { canManageUsers } from "@/features/auth/admin-permissions";
import {
  AdminUserValidationError,
  resetAdminUserPassword,
} from "@/features/admin-users/admin-user.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const session = getAdminSessionFromRequest(req);
  if (!canManageUsers(session)) {
    return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  try {
    await resetAdminUserPassword(
      id,
      typeof raw.password === "string" ? raw.password : "",
      session.userId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminUserValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/admin/users/[id]/reset-password]", err);
    return NextResponse.json({ message: "Không thể đặt lại mật khẩu." }, { status: 500 });
  }
}
