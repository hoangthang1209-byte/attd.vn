import type { NextRequest } from "next/server";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import {
  createAnonymousSession,
  createOwnerSession,
  grantsToPermissionMap,
} from "@/features/auth/admin-session.types";
import { verifyAdminSessionToken, getAdminSessionSecret, ADMIN_SESSION_MESSAGE } from "@/lib/admin-auth/config";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { getAdminSessionPayloadFromRequestEdge } from "@/lib/admin-auth/staff-session-edge";
import { isAdminSessionPayloadV2 } from "@/lib/admin-auth/admin-session.shared";

async function isAuthenticatedEdge(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const secret = getAdminSessionSecret();
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ADMIN_SESSION_MESSAGE));
  const expected = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return verifyAdminSessionToken(token, expected);
}

function payloadToSession(
  authenticated: boolean,
  payload: Awaited<ReturnType<typeof getAdminSessionPayloadFromRequestEdge>>,
): AdminSessionUser {
  if (!authenticated) return createAnonymousSession();
  if (!payload) return createOwnerSession();

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

  if (payload.mode === "owner") return createOwnerSession();

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

export async function getAdminSessionFromRequestEdge(
  request: NextRequest,
): Promise<AdminSessionUser> {
  const authenticated = await isAuthenticatedEdge(request);
  const payload = authenticated ? await getAdminSessionPayloadFromRequestEdge(request) : null;
  return payloadToSession(authenticated, payload);
}
