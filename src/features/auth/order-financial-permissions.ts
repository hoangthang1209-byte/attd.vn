import type { EmployeeRole } from "@prisma/client";

/** Admin session identity used for financial visibility checks. */
export type AdminSessionUser = {
  authenticated: boolean;
  employeeId: string | null;
  /** `null` = trusted full-access login (no employee selected). */
  role: EmployeeRole | null;
};

export const ORDER_FINANCIAL_DENIED_MESSAGE =
  "Bạn không có quyền xem thông tin tài chính của đơn hàng.";

export const FINANCIAL_ROUTE_DENIED_MESSAGE =
  "Bạn không có quyền truy cập khu vực này.";

const FINANCIAL_VIEW_ROLES = new Set<EmployeeRole>(["ADMIN", "SALES"]);

/** Roles that must never see order financial fields. */
export const OPERATIONAL_NO_FINANCIAL_ROLES = new Set<EmployeeRole>([
  "PRODUCTION",
  "DELIVERY",
  "OTHER",
]);

export function canViewOrderFinancials(user: AdminSessionUser): boolean {
  if (!user.authenticated) return false;
  if (!user.role) return true;
  return FINANCIAL_VIEW_ROLES.has(user.role);
}

export function isProductionStaffUser(user: AdminSessionUser): boolean {
  return user.authenticated && user.role === "PRODUCTION";
}

export function isOperationalStaffWithoutFinancials(user: AdminSessionUser): boolean {
  if (!user.authenticated || !user.role) return false;
  return OPERATIONAL_NO_FINANCIAL_ROLES.has(user.role);
}

const FINANCIAL_ADMIN_ROUTE_PREFIXES = [
  "/admin/quotes",
  "/admin/pricing",
  "/admin/finance",
  "/admin/crm/revenue-categories",
] as const;

const FINANCIAL_ORDER_CREATE_PREFIXES = [
  "/admin/orders/new",
] as const;

const ORDER_EDIT_PATH = /^\/admin\/orders\/[^/]+\/edit$/;

export function isFinancialAdminRoute(pathname: string): boolean {
  if (FINANCIAL_ADMIN_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (FINANCIAL_ORDER_CREATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (ORDER_EDIT_PATH.test(pathname)) return true;
  return false;
}

export function canAccessAdminRoute(user: AdminSessionUser, pathname: string): boolean {
  if (!user.authenticated) return false;
  if (!isFinancialAdminRoute(pathname)) return true;
  return canViewOrderFinancials(user);
}

export function canAccessOrderFinancialPdf(
  user: AdminSessionUser,
  docType: "confirmation" | "production" | "delivery",
): boolean {
  if (docType === "production") return user.authenticated;
  return canViewOrderFinancials(user);
}
