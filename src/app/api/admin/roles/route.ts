import { NextRequest, NextResponse } from "next/server";
import { canManageRolesPermissions } from "@/features/auth/admin-permissions";
import {
  createCustomAdminRole,
  getAdminRoleDetail,
  listAdminRoles,
  updateAdminRoleMeta,
} from "@/features/admin-roles/admin-role.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!canManageRolesPermissions(session)) {
    return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
  }
  const roles = await listAdminRoles();
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!canManageRolesPermissions(session)) {
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
    const role = await createCustomAdminRole({
      code: typeof raw.code === "string" ? raw.code : "",
      name: typeof raw.name === "string" ? raw.name : "",
      description: typeof raw.description === "string" ? raw.description : null,
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo vai trò.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
