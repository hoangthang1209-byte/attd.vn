import type { NextRequest } from "next/server";
import type { AdminSessionUser } from "@/features/auth/order-financial-permissions";
import {
  getSessionTokenFromCookies,
  getSessionTokenFromRequest,
  verifyAdminSessionCookie,
} from "@/lib/admin-auth/session-node";
import {
  getStaffSessionFromCookies,
  getStaffSessionFromRequest,
} from "@/lib/admin-auth/staff-session-node";

function toAdminSessionUser(
  authenticated: boolean,
  staff: Awaited<ReturnType<typeof getStaffSessionFromCookies>>,
): AdminSessionUser {
  return {
    authenticated,
    employeeId: staff?.employeeId ?? null,
    role: staff?.role ?? null,
  };
}

export async function getAdminSessionFromCookies(): Promise<AdminSessionUser> {
  const token = await getSessionTokenFromCookies();
  const authenticated = verifyAdminSessionCookie(token);
  const staff = authenticated ? await getStaffSessionFromCookies() : null;
  return toAdminSessionUser(authenticated, staff);
}

export function getAdminSessionFromRequest(request: NextRequest): AdminSessionUser {
  const authenticated = verifyAdminSessionCookie(getSessionTokenFromRequest(request));
  const staff = authenticated ? getStaffSessionFromRequest(request) : null;
  return toAdminSessionUser(authenticated, staff);
}
