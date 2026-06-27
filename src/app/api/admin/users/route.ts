import { NextRequest, NextResponse } from "next/server";
import { canManageUsers } from "@/features/auth/admin-permissions";
import {
  AdminUserValidationError,
  createAdminUser,
  listAdminUsers,
} from "@/features/admin-users/admin-user.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!canManageUsers(session)) {
    return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
  }
  const users = await listAdminUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!canManageUsers(session)) {
    return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  try {
    const user = await createAdminUser({
      username: typeof raw.username === "string" ? raw.username : "",
      password: typeof raw.password === "string" ? raw.password : "",
      employeeId: typeof raw.employeeId === "string" ? raw.employeeId : null,
      roleId: typeof raw.roleId === "string" ? raw.roleId : "",
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminUserValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json({ message: "Không thể tạo tài khoản." }, { status: 500 });
  }
}
