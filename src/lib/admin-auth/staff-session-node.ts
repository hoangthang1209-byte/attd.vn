import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { EmployeeRole } from "@prisma/client";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import {
  ADMIN_SESSION_MESSAGE_PREFIX,
  ADMIN_SESSION_PAYLOAD_VERSION,
  decodeAdminSessionPayload,
  encodeAdminSessionPayload,
  isAdminSessionPayloadV2,
  splitAdminSessionToken,
  type AdminSessionPayload,
  type SessionPermissionGrant,
} from "@/lib/admin-auth/admin-session.shared";
import {
  STAFF_SESSION_MESSAGE_PREFIX,
  decodeStaffSessionPayload,
  encodeStaffSessionPayload,
  splitStaffSessionToken,
} from "@/lib/admin-auth/staff-session.shared";

function signPayloadPart(prefix: string, payloadPart: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${prefix}${payloadPart}`)
    .digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function createAdminSessionToken(payload: AdminSessionPayload): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  const payloadPart = encodeAdminSessionPayload(payload);
  const signature = signPayloadPart(ADMIN_SESSION_MESSAGE_PREFIX, payloadPart, secret);
  return `${payloadPart}.${signature}`;
}

function verifyV2Token(token: string, secret: string): AdminSessionPayload | null {
  const parts = splitAdminSessionToken(token);
  if (!parts) return null;
  const expected = signPayloadPart(ADMIN_SESSION_MESSAGE_PREFIX, parts.payloadPart, secret);
  if (!timingSafeEqualHex(parts.signature, expected)) return null;
  const decoded = decodeAdminSessionPayload(parts.payloadPart);
  if (!decoded || !isAdminSessionPayloadV2(decoded)) return null;
  return decoded;
}

function verifyV1LegacyToken(
  token: string,
  secret: string,
): { employeeId: string | null; role: EmployeeRole | null } | null {
  const parts = splitStaffSessionToken(token);
  if (!parts) return null;
  const expected = signPayloadPart(STAFF_SESSION_MESSAGE_PREFIX, parts.payloadPart, secret);
  if (!timingSafeEqualHex(parts.signature, expected)) return null;
  return decodeStaffSessionPayload(parts.payloadPart);
}

export function verifyAdminSessionPayloadToken(
  token: string | undefined | null,
): AdminSessionPayload | { employeeId: string | null; role: EmployeeRole | null } | null {
  if (!token) return null;
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const v2 = verifyV2Token(token, secret);
  if (v2) return v2;

  return verifyV1LegacyToken(token, secret);
}

export function getAdminSessionPayloadFromRequest(
  request: NextRequest,
): AdminSessionPayload | { employeeId: string | null; role: EmployeeRole | null } | null {
  return verifyAdminSessionPayloadToken(request.cookies.get(ADMIN_STAFF_SESSION_COOKIE)?.value);
}

export async function getAdminSessionPayloadFromCookies(): Promise<
  AdminSessionPayload | { employeeId: string | null; role: EmployeeRole | null } | null
> {
  const cookieStore = await cookies();
  return verifyAdminSessionPayloadToken(cookieStore.get(ADMIN_STAFF_SESSION_COOKIE)?.value);
}

export function buildOwnerSessionPayload(): AdminSessionPayload {
  return {
    v: ADMIN_SESSION_PAYLOAD_VERSION,
    mode: "owner",
    userId: null,
    username: null,
    employeeId: null,
    roleId: null,
    roleCode: "OWNER",
    legacyEmployeeRole: null,
    permissions: [],
  };
}

export function buildUserSessionPayload(input: {
  userId: string;
  username: string;
  employeeId: string | null;
  roleId: string | null;
  roleCode: string | null;
  permissions: SessionPermissionGrant[];
}): AdminSessionPayload {
  return {
    v: ADMIN_SESSION_PAYLOAD_VERSION,
    mode: "user",
    userId: input.userId,
    username: input.username,
    employeeId: input.employeeId,
    roleId: input.roleId,
    roleCode: input.roleCode,
    legacyEmployeeRole: null,
    permissions: input.permissions,
  };
}

export function buildLegacySessionPayload(input: {
  employeeId: string | null;
  role: EmployeeRole | null;
  roleId: string | null;
  roleCode: string | null;
  permissions: SessionPermissionGrant[];
}): AdminSessionPayload {
  return {
    v: ADMIN_SESSION_PAYLOAD_VERSION,
    mode: "legacy",
    userId: null,
    username: null,
    employeeId: input.employeeId,
    roleId: input.roleId,
    roleCode: input.roleCode,
    legacyEmployeeRole: input.role,
    permissions: input.permissions,
  };
}

// Backward-compatible exports used by older imports
export {
  createAdminSessionToken as createStaffSessionToken,
  verifyAdminSessionPayloadToken as verifyStaffSessionToken,
};
