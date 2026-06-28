/**
 * Backward-compatible re-exports — prefer @/features/auth/admin-permissions and admin-session.types.
 */
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { can, canViewOrderFinancials as canViewFinancials } from "@/features/auth/admin-permissions";

export type { AdminSessionUser };
export {
  ORDER_FINANCIAL_DENIED_MESSAGE,
  FINANCIAL_ROUTE_DENIED_MESSAGE,
  DATA_ACCESS_DENIED_MESSAGE,
} from "@/features/auth/admin-session.types";

export { canViewFinancials as canViewOrderFinancials };

const FINANCIAL_ADMIN_ROUTE_PREFIXES = [
  "/admin/quotes",
  "/admin/pricing",
  "/admin/finance",
  "/admin/crm/revenue-categories",
] as const;

const FINANCIAL_ORDER_CREATE_PREFIXES = ["/admin/orders/new"] as const;
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

export function isProductionStaffUser(session: AdminSessionUser): boolean {
  return session.authenticated && session.roleCode === "PRODUCTION";
}

export function canAccessAdminRoute(session: AdminSessionUser, pathname: string): boolean {
  if (!session.authenticated) return false;
  if (!isFinancialAdminRoute(pathname)) return true;
  if (can(session, "orders.update") && pathname.match(ORDER_EDIT_PATH)) return true;
  if (can(session, "orders.create") && pathname.startsWith("/admin/orders/new")) return true;
  if (pathname.startsWith("/admin/quotes")) return can(session, "quotes.view");
  if (pathname.startsWith("/admin/pricing")) return can(session, "pricing.manage");
  if (pathname.startsWith("/admin/crm/revenue-categories")) return can(session, "revenue_categories.manage");
  return canViewFinancials(session);
}

export function canAccessOrderFinancialPdf(
  session: AdminSessionUser,
  docType: "confirmation" | "production" | "delivery",
): boolean {
  if (docType === "production") return can(session, "production.view");
  return canViewFinancials(session);
}

const PRODUCTION_ADMIN_ROUTE_PREFIXES = [
  "/admin/tech-pack",
  "/admin/rap",
  "/admin/trims",
  "/admin/production-materials",
  "/admin/production-suppliers",
  "/admin/print-methods",
  "/admin/measurement-template",
] as const;

export function getRequiredPermissionForAdminRoute(pathname: string): string | null {
  if (pathname.startsWith("/admin/settings/users")) return "users.manage";
  if (pathname.startsWith("/admin/settings/roles")) return "roles_permissions.manage";
  if (pathname.startsWith("/admin/quotes")) return "quotes.view";
  if (pathname.startsWith("/admin/pricing")) return "pricing.manage";
  if (pathname.startsWith("/admin/crm/revenue-categories")) return "revenue_categories.manage";
  if (pathname.startsWith("/admin/crm")) return "crm.view";
  if (pathname.startsWith("/admin/orders/new")) return "orders.create";
  if (ORDER_EDIT_PATH.test(pathname)) return "orders.update";
  if (pathname.startsWith("/admin/orders")) return "orders.view";
  if (pathname.startsWith("/admin/production")) return "production.view";
  if (PRODUCTION_ADMIN_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "production.view";
  }
  if (pathname.startsWith("/admin/delivery")) return "delivery.view";
  if (pathname.startsWith("/admin/warehouse") || pathname.includes("/materials/warehouse")) {
    return "warehouse.view";
  }
  if (pathname.startsWith("/admin/materials") || pathname.startsWith("/admin/purchase-requests")) {
    return "warehouse.view";
  }
  if (pathname.startsWith("/admin/products") || pathname.startsWith("/admin/danh-muc")) {
    return "products.view";
  }
  if (pathname.startsWith("/admin/media")) return "media.view";
  if (pathname.startsWith("/admin/employees")) return "employees.manage";
  if (pathname.startsWith("/admin/dashboard")) return "dashboard.view";
  if (pathname.startsWith("/admin/operations")) return "orders.view";
  return null;
}
