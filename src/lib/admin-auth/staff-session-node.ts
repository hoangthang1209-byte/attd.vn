import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { EmployeeRole } from "@prisma/client";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import {
  decodeStaffSessionPayload,
  encodeStaffSessionPayload,
  splitStaffSessionToken,
  STAFF_SESSION_MESSAGE_PREFIX,
  type AdminStaffSessionPayload,
} from "@/lib/admin-auth/staff-session.shared";

function signStaffPayloadPart(payloadPart: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${STAFF_SESSION_MESSAGE_PREFIX}${payloadPart}`)
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

export function createStaffSessionToken(payload: AdminStaffSessionPayload): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  const payloadPart = encodeStaffSessionPayload(payload);
  const signature = signStaffPayloadPart(payloadPart, secret);
  return `${payloadPart}.${signature}`;
}

export function verifyStaffSessionToken(token: string | undefined | null): AdminStaffSessionPayload | null {
  if (!token) return null;
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const parts = splitStaffSessionToken(token);
  if (!parts) return null;

  const expected = signStaffPayloadPart(parts.payloadPart, secret);
  if (!timingSafeEqualHex(parts.signature, expected)) return null;

  return decodeStaffSessionPayload(parts.payloadPart);
}

export function getStaffSessionFromRequest(request: NextRequest): AdminStaffSessionPayload | null {
  return verifyStaffSessionToken(request.cookies.get(ADMIN_STAFF_SESSION_COOKIE)?.value);
}

export async function getStaffSessionFromCookies(): Promise<AdminStaffSessionPayload | null> {
  const cookieStore = await cookies();
  return verifyStaffSessionToken(cookieStore.get(ADMIN_STAFF_SESSION_COOKIE)?.value);
}

export type ResolvedStaffLogin = {
  employeeId: string | null;
  role: EmployeeRole | null;
};

export function resolveStaffLoginFromEmployee(input: {
  employeeId: string | null | undefined;
  role: EmployeeRole | null | undefined;
  isActive: boolean;
}): ResolvedStaffLogin {
  if (!input.employeeId) {
    return { employeeId: null, role: null };
  }
  if (!input.isActive) {
    return { employeeId: null, role: null };
  }
  return {
    employeeId: input.employeeId,
    role: input.role ?? null,
  };
}
