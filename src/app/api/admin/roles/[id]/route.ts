import { NextRequest, NextResponse } from "next/server";
import type { PermissionScope } from "@prisma/client";
import { canManageRolesPermissions } from "@/features/auth/admin-permissions";
import {
  getAdminRoleDetail,
  updateAdminRoleMeta,
  updateAdminRolePermissions,
} from "@/features/admin-roles/admin-role.service";
import { logAdminAuditEvent } from "@/features/auth/admin-audit-log";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = getAdminSessionFromRequest(_req);
  if (!canManageRolesPermissions(session)) {
    return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
  }
  const { id } = await context.params;
  const role = await getAdminRoleDetail(id);
  if (!role) return NextResponse.json({ message: "Không tìm thấy vai trò." }, { status: 404 });
  return NextResponse.json({ role });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "operations",
    action: "admin",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const session = getAdminSessionFromRequest(req);
  if (!canManageRolesPermissions(session)) {
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
    if (Array.isArray(raw.permissions)) {
      const grants = raw.permissions
        .filter((item): item is { permissionId: string; scope: PermissionScope } => {
          return Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as { permissionId?: unknown }).permissionId === "string" &&
              typeof (item as { scope?: unknown }).scope === "string",
          );
        })
        .map((item) => ({
          permissionId: item.permissionId,
          scope: item.scope,
        }));
      const role = await updateAdminRolePermissions(id, grants);
      logAdminAuditEvent({
        action: "role_permissions_updated",
        userId: session.userId,
        detail: { roleId: id },
      });
      return NextResponse.json({ role });
    }

    const role = await updateAdminRoleMeta(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      description: typeof raw.description === "string" ? raw.description : raw.description === null ? null : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật vai trò.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
