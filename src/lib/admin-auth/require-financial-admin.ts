import { redirect } from "next/navigation";
import {
  canViewOrderFinancials,
  FINANCIAL_ROUTE_DENIED_MESSAGE,
} from "@/features/auth/order-financial-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { logFinancialAccessDenied } from "@/lib/admin-auth/financial-access";

export async function requireFinancialAdminPage(
  pathname: string,
  fallbackPath = "/admin/orders",
): Promise<void> {
  const session = await getAdminSessionFromCookies();
  if (!session.authenticated) return;
  if (canViewOrderFinancials(session)) return;

  logFinancialAccessDenied({
    user: session,
    route: pathname,
    action: "page_forbidden",
  });

  redirect(`${fallbackPath}?forbidden=${encodeURIComponent(FINANCIAL_ROUTE_DENIED_MESSAGE)}`);
}
