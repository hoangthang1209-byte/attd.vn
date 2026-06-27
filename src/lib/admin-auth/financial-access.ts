import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { logAdminAuditEvent } from "@/features/auth/admin-audit-log";
import {
  can,
  canViewOrderFinancials,
} from "@/features/auth/admin-permissions";
import {
  FINANCIAL_ROUTE_DENIED_MESSAGE,
  getRequiredPermissionForAdminRoute,
  isFinancialAdminRoute,
} from "@/features/auth/order-financial-permissions";

export function logFinancialAccessDenied(input: {
  user: AdminSessionUser;
  route: string;
  action: string;
}): void {
  logAdminAuditEvent({
    action: input.action === "api_forbidden" ? "forbidden_api" : "forbidden_route",
    userId: input.user.userId,
    employeeId: input.user.employeeId,
    route: input.route,
    detail: { roleCode: input.user.roleCode },
  });
}

export function financialApiForbiddenResponse(route: string, user: AdminSessionUser) {
  logFinancialAccessDenied({ user, route, action: "api_forbidden" });
  return Response.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
}

export function assertFinancialApiAccess(user: AdminSessionUser, route: string): Response | null {
  if (canViewOrderFinancials(user)) return null;
  return financialApiForbiddenResponse(route, user);
}

export function assertFinancialRouteAccess(
  user: AdminSessionUser,
  pathname: string,
): boolean {
  if (!user.authenticated) return false;

  const required = getRequiredPermissionForAdminRoute(pathname);
  if (required && !can(user, required)) {
    logFinancialAccessDenied({ user, route: pathname, action: "route_forbidden" });
    return false;
  }

  if (!isFinancialAdminRoute(pathname)) return true;
  if (canViewOrderFinancials(user)) return true;
  logFinancialAccessDenied({ user, route: pathname, action: "route_forbidden" });
  return false;
}
