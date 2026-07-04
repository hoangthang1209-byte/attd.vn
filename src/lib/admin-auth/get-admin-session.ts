import type { NextRequest } from "next/server";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import {
  createAnonymousSession,
  createOwnerSession,
  grantsToPermissionMap,
} from "@/features/auth/admin-session.types";
import {
  getSessionTokenFromCookies,
  getSessionTokenFromRequest,
  verifyAdminSessionCookie,
} from "@/lib/admin-auth/session-node";
import {
  getAdminSessionPayloadFromCookies,
  getAdminSessionPayloadFromRequest,
} from "@/lib/admin-auth/staff-session-node";
import { isAdminSessionPayloadV2 } from "@/lib/admin-auth/admin-session.shared";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth/resolve-admin-session-auth";

function payloadToSession(
  authenticated: boolean,
  payload: Awaited<ReturnType<typeof getAdminSessionPayloadFromCookies>>,
): AdminSessionUser {
  if (!authenticated) return createAnonymousSession();

  if (!payload) {
    return createOwnerSession();
  }

  if (!isAdminSessionPayloadV2(payload)) {
    return {
      authenticated: true,
      mode: "legacy",
      userId: null,
      username: null,
      employeeId: payload.employeeId,
      roleId: null,
      roleCode: payload.role,
      legacyEmployeeRole: payload.role,
      permissions: new Map(),
    };
  }

  if (payload.mode === "owner") {
    return createOwnerSession();
  }

  return {
    authenticated: true,
    mode: payload.mode,
    userId: payload.userId,
    username: payload.username,
    employeeId: payload.employeeId,
    roleId: payload.roleId,
    roleCode: payload.roleCode,
    legacyEmployeeRole: payload.legacyEmployeeRole,
    permissions: grantsToPermissionMap(payload.permissions),
  };
}

export async function getAdminSessionFromCookies(): Promise<AdminSessionUser> {
  const ownerGateValid = verifyAdminSessionCookie(await getSessionTokenFromCookies());
  const payload = await getAdminSessionPayloadFromCookies();
  const authenticated = isAdminRequestAuthenticated({ ownerGateValid, staffPayload: payload });
  return payloadToSession(authenticated, authenticated ? payload : null);
}

export function getAdminSessionFromRequest(request: NextRequest): AdminSessionUser {
  const ownerGateValid = verifyAdminSessionCookie(getSessionTokenFromRequest(request));
  const payload = getAdminSessionPayloadFromRequest(request);
  const authenticated = isAdminRequestAuthenticated({ ownerGateValid, staffPayload: payload });
  return payloadToSession(authenticated, authenticated ? payload : null);
}
