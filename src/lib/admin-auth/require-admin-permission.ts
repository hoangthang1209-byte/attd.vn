import { redirect } from "next/navigation";
import { can } from "@/features/auth/admin-permissions";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { logAdminAuditEvent } from "@/features/auth/admin-audit-log";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";

export async function requireAdminPermissionPage(
  permissionCode: string,
  fallbackPath = "/admin/dashboard",
): Promise<void> {
  const session = await getAdminSessionFromCookies();
  if (!session.authenticated) return;
  if (can(session, permissionCode)) return;

  logAdminAuditEvent({
    action: "forbidden_route",
    userId: session.userId,
    route: permissionCode,
  });

  redirect(`${fallbackPath}?forbidden=${encodeURIComponent(FINANCIAL_ROUTE_DENIED_MESSAGE)}`);
}
