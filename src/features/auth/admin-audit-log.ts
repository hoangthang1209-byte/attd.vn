type AdminAuditEvent = {
  action:
    | "login_success"
    | "login_failed"
    | "login_owner"
    | "logout"
    | "user_created"
    | "user_updated"
    | "user_locked"
    | "user_unlocked"
    | "password_reset"
    | "role_permissions_updated"
    | "forbidden_route"
    | "forbidden_api"
    | "forbidden_data";
  userId?: string | null;
  actorUserId?: string | null;
  employeeId?: string | null;
  route?: string;
  detail?: Record<string, unknown>;
};

export function logAdminAuditEvent(event: AdminAuditEvent): void {
  console.warn("[admin-audit]", {
    ...event,
    at: new Date().toISOString(),
  });
}
