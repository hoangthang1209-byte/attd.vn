import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { can, getPermissionScope } from "@/features/auth/admin-permissions";

export function assertCanViewCrmLeads(session: AdminSessionUser): void {
  if (!session.authenticated || !can(session, "crm.view")) {
    throw new Error("FORBIDDEN");
  }
}

export function resolveCrmLeadListAssignedToFilter(
  session: AdminSessionUser,
  requestedAssignedTo: string | undefined
): string | undefined {
  const scope = getPermissionScope(session, "crm.view");
  if (scope === "OWN") {
    return session.employeeId ?? undefined;
  }
  return requestedAssignedTo;
}

export function assertCanViewCrmLeadDetail(
  session: AdminSessionUser,
  lead: { assignedTo: string | null }
): void {
  assertCanViewCrmLeads(session);
  const scope = getPermissionScope(session, "crm.view");
  if (scope === "OWN" && lead.assignedTo !== session.employeeId) {
    throw new Error("FORBIDDEN");
  }
}
