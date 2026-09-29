import type { Lead, PermissionScope, Prisma } from "@prisma/client";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { can, getPermissionScope } from "@/features/auth/admin-permissions";

type LeadScopeFields = Pick<Lead, "assignedEmployeeId" | "assignedTo">;
const NO_ACCESS: Prisma.LeadWhereInput = { id: "__no_access__" };

export function getLeadPermissionScope(
  session: AdminSessionUser,
  permissionCode: string,
): PermissionScope {
  const explicit = getPermissionScope(session, permissionCode);
  if (explicit !== "NONE") return explicit;

  if (!can(session, permissionCode)) return "NONE";
  if (session.mode === "legacy") {
    if (session.legacyEmployeeRole === "ADMIN") return "ALL";
    if (session.legacyEmployeeRole === "SALES") return "OWN";
  }
  return "NONE";
}

export function buildScopedLeadWhere(
  session: AdminSessionUser,
  permissionCode = "leads.view",
): Prisma.LeadWhereInput {
  const scope = getLeadPermissionScope(session, permissionCode);
  if (scope === "NONE") return NO_ACCESS;
  if (scope === "ALL" || scope === "TEAM") return {};
  if (!session.employeeId) return NO_ACCESS;

  if (scope === "OWN" || scope === "ASSIGNED") {
    return {
      OR: [
        { assignedEmployeeId: session.employeeId },
        { assignedTo: session.employeeId },
        { AND: [{ assignedEmployeeId: null }, { assignedTo: null }] },
      ],
    };
  }
  return NO_ACCESS;
}

export function canAccessLeadRecord(
  session: AdminSessionUser,
  lead: LeadScopeFields,
  permissionCode = "leads.view",
): boolean {
  const scope = getLeadPermissionScope(session, permissionCode);
  if (scope === "NONE") return false;
  if (scope === "ALL" || scope === "TEAM") return true;
  if (!session.employeeId) return false;
  if (lead.assignedEmployeeId) return lead.assignedEmployeeId === session.employeeId;
  if (lead.assignedTo) return lead.assignedTo === session.employeeId;
  return true;
}
