import { NextRequest, NextResponse } from "next/server";
import { canManageUsers } from "@/features/auth/admin-permissions";
import {
  AdminUserValidationError,
  updateAdminUser,
} from "@/features/admin-users/admin-user.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
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
    const user = await updateAdminUser(
      id,
      {
        employeeId:
          raw.employeeId === null
            ? null
            : typeof raw.employeeId === "string"
              ? raw.employeeId
              : undefined,
        roleId: typeof raw.roleId === "string" ? raw.roleId : undefined,
        isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
      },
      session.userId,
    );
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AdminUserValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/admin/users/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật tài khoản." }, { status: 500 });
  }
}
