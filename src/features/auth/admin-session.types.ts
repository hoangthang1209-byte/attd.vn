import type { EmployeeRole, PermissionScope } from "@prisma/client";

export type AdminSessionMode = "owner" | "user" | "legacy" | "anonymous";

export type AdminSessionUser = {
  authenticated: boolean;
  mode: AdminSessionMode;
  userId: string | null;
  username: string | null;
  employeeId: string | null;
  roleId: string | null;
  roleCode: string | null;
  /** @deprecated transitional — prefer roleCode */
  legacyEmployeeRole: EmployeeRole | null;
  permissions: ReadonlyMap<string, PermissionScope>;
};

export const DATA_ACCESS_DENIED_MESSAGE = "Bạn không có quyền truy cập dữ liệu này.";

export const FINANCIAL_ROUTE_DENIED_MESSAGE =
  "Bạn không có quyền truy cập khu vực này.";

export const ORDER_FINANCIAL_DENIED_MESSAGE =
  "Bạn không có quyền xem thông tin tài chính của đơn hàng.";

export function createAnonymousSession(): AdminSessionUser {
  return {
    authenticated: false,
    mode: "anonymous",
    userId: null,
    username: null,
    employeeId: null,
    roleId: null,
    roleCode: null,
    legacyEmployeeRole: null,
    permissions: new Map(),
  };
}

export function createOwnerSession(): AdminSessionUser {
  return {
    authenticated: true,
    mode: "owner",
    userId: null,
    username: null,
    employeeId: null,
    roleId: null,
    roleCode: "OWNER",
    legacyEmployeeRole: null,
    permissions: new Map(),
  };
}

export function grantsToPermissionMap(
  grants: Array<[string, PermissionScope]>,
): ReadonlyMap<string, PermissionScope> {
  return new Map(grants);
}
