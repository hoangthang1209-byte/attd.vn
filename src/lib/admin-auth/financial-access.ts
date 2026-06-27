import type { AdminSessionUser } from "@/features/auth/order-financial-permissions";
import {
  canViewOrderFinancials,
  FINANCIAL_ROUTE_DENIED_MESSAGE,
  isFinancialAdminRoute,
} from "@/features/auth/order-financial-permissions";

export function logFinancialAccessDenied(input: {
  user: AdminSessionUser;
  route: string;
  action: string;
}): void {
  console.warn("[admin-financial-access-denied]", {
    employeeId: input.user.employeeId,
    role: input.user.role,
    route: input.route,
    action: input.action,
    at: new Date().toISOString(),
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
  if (!isFinancialAdminRoute(pathname)) return true;
  if (canViewOrderFinancials(user)) return true;
  logFinancialAccessDenied({ user, route: pathname, action: "route_forbidden" });
  return false;
}
