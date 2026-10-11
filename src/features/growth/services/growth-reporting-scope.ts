import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { can, canViewOrderFinancials } from "@/features/auth/admin-permissions";

export function assertCanViewGrowthDashboard(session: AdminSessionUser): void {
  if (!session.authenticated) {
    throw new Error("FORBIDDEN");
  }
  if (can(session, "growth.view")) return;
  if (can(session, "dashboard.view") && can(session, "reports.view")) return;
  if (session.roleCode === "OWNER" || session.roleCode === "ADMIN") return;
  throw new Error("FORBIDDEN");
}

export function growthDashboardMeta(session: AdminSessionUser) {
  return {
    canViewFinancials: canViewOrderFinancials(session),
  };
}
