import type { Lead, Prisma } from "@prisma/client";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { getPermissionScope } from "@/features/auth/admin-permissions";

type LeadScopeFields = Pick<Lead, "assignedEmployeeId">;
const NO_ACCESS: Prisma.LeadWhereInput = { id: "__no_access__" };

export function buildScopedLeadWhere(
  session: AdminSessionUser,
  permissionCode = "leads.view",
): Prisma.LeadWhereInput {
  const scope = getPermissionScope(session, permissionCode);
  if (scope === "NONE") return NO_ACCESS;
  if (scope === "ALL" || scope === "TEAM") return {};
  if (!session.employeeId) return NO_ACCESS;
  if (scope === "OWN" || scope === "ASSIGNED") {
    return { assignedEmployeeId: session.employeeId };
  }
  return NO_ACCESS;
}

export function canAccessLeadRecord(
  session: AdminSessionUser,
  lead: LeadScopeFields,
  permissionCode = "leads.view",
): boolean {
  const scope = getPermissionScope(session, permissionCode);
  if (scope === "NONE") return false;
  if (scope === "ALL" || scope === "TEAM") return true;
  if (!session.employeeId) return false;
  return lead.assignedEmployeeId === session.employeeId;
}
