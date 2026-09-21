import type { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/errors/permission-errors";

export async function requireAutomationDashboardPermission(request: NextRequest): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const session = getAdminSessionFromRequest(request);
  if (!session.authenticated) {
    return { ok: false, response: unauthorizedResponse() };
  }
  if (!can(session, "dashboard.view")) {
    return { ok: false, response: forbiddenResponse() };
  }
  return { ok: true };
}
