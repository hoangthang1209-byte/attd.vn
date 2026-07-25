import type { PermissionScope } from "@prisma/client";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";

/** TEAM scope is not implemented — treated as ALL until department model exists. */
export function effectivePermissionScope(scope: PermissionScope): PermissionScope {
  if (scope === "TEAM") return "ALL";
  return scope;
}

export function isOwnerLikeSession(session: AdminSessionUser): boolean {
  return session.authenticated && session.mode === "owner";
}

export function getPermissionScope(
  session: AdminSessionUser,
  permissionCode: string,
): PermissionScope {
  if (!session.authenticated) return "NONE";
  if (isOwnerLikeSession(session)) return "ALL";
  const scope = session.permissions.get(permissionCode);
  if (!scope) return "NONE";
  return effectivePermissionScope(scope);
}

export function can(session: AdminSessionUser, permissionCode: string): boolean {
  if (!session.authenticated) return false;
  if (isOwnerLikeSession(session)) return true;
  if (session.permissions.size > 0) {
    return getPermissionScope(session, permissionCode) !== "NONE";
  }

  if (session.mode === "legacy" && session.legacyEmployeeRole) {
    return legacyRoleAllows(session.legacyEmployeeRole, permissionCode);
  }

  return false;
}

const LEGACY_PRODUCTION_CODES = new Set([
  "dashboard.view",
  "orders.view",
  "production.view",
  "production.update",
  "manufacturing.production.view",
  "manufacturing.production.create",
  "manufacturing.production.update",
  "manufacturing.production.assign",
  "qc.update",
  "warehouse.view",
  "media.view",
]);

const LEGACY_SALES_CODES = new Set([
  "dashboard.view",
  "crm.view",
  "customers.view",
  "customers.create",
  "customers.update",
  "leads.view",
  "leads.create",
  "leads.update",
  "quotes.view",
  "quotes.create",
  "quotes.update",
  "orders.view",
  "orders.create",
  "orders.update",
  "orders.view_financials",
  "payments.view",
  "production.view",
  "manufacturing.production.view",
  "delivery.view",
]);

function legacyRoleAllows(role: NonNullable<AdminSessionUser["legacyEmployeeRole"]>, code: string): boolean {
  if (role === "ADMIN") return true;
  if (role === "SALES") return LEGACY_SALES_CODES.has(code);
  if (role === "PRODUCTION") return LEGACY_PRODUCTION_CODES.has(code);
  if (role === "DELIVERY") {
    return [
      "dashboard.view",
      "orders.view",
      "delivery.view",
      "delivery.update",
      "production.view",
      "manufacturing.production.view",
    ].includes(code);
  }
  return ["dashboard.view", "orders.view", "production.view", "manufacturing.production.view"].includes(code);
}

export function canViewOrderFinancials(session: AdminSessionUser): boolean {
  if (!session.authenticated) return false;
  if (isOwnerLikeSession(session)) return true;
  if (session.permissions.size > 0) return can(session, "orders.view_financials");
  if (session.legacyEmployeeRole === "ADMIN" || session.legacyEmployeeRole === "SALES") return true;
  return false;
}

export function canManageRolesPermissions(session: AdminSessionUser): boolean {
  return can(session, "roles_permissions.manage");
}

export function canManageUsers(session: AdminSessionUser): boolean {
  return can(session, "users.manage");
}

export function assertPermission(
  session: AdminSessionUser,
  permissionCode: string,
): void {
  if (!can(session, permissionCode)) {
    throw new PermissionDeniedError(permissionCode);
  }
}

export class PermissionDeniedError extends Error {
  readonly permissionCode: string;

  constructor(permissionCode: string) {
    super("Bạn không có quyền truy cập khu vực này.");
    this.name = "PermissionDeniedError";
    this.permissionCode = permissionCode;
  }
}
