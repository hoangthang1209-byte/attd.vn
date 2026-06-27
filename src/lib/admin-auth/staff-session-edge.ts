import type { NextRequest } from "next/server";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import {
  ADMIN_SESSION_MESSAGE_PREFIX,
  decodeAdminSessionPayload,
  isAdminSessionPayloadV2,
  splitAdminSessionToken,
  type AdminSessionPayload,
} from "@/lib/admin-auth/admin-session.shared";
import {
  STAFF_SESSION_MESSAGE_PREFIX,
  decodeStaffSessionPayload,
  splitStaffSessionToken,
} from "@/lib/admin-auth/staff-session.shared";
import type { EmployeeRole } from "@prisma/client";

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function signPayloadPartEdge(prefix: string, payloadPart: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${prefix}${payloadPart}`));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminSessionPayloadTokenEdge(
  token: string | undefined | null,
): Promise<AdminSessionPayload | { employeeId: string | null; role: EmployeeRole | null } | null> {
  if (!token) return null;
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const v2parts = splitAdminSessionToken(token);
  if (v2parts) {
    const expected = await signPayloadPartEdge(ADMIN_SESSION_MESSAGE_PREFIX, v2parts.payloadPart, secret);
    if (timingSafeEqualString(v2parts.signature, expected)) {
      const decoded = decodeAdminSessionPayload(v2parts.payloadPart);
      if (decoded && isAdminSessionPayloadV2(decoded)) return decoded;
    }
  }

  const v1parts = splitStaffSessionToken(token);
  if (!v1parts) return null;
  const expectedV1 = await signPayloadPartEdge(STAFF_SESSION_MESSAGE_PREFIX, v1parts.payloadPart, secret);
  if (!timingSafeEqualString(v1parts.signature, expectedV1)) return null;
  return decodeStaffSessionPayload(v1parts.payloadPart);
}

export async function getAdminSessionPayloadFromRequestEdge(request: NextRequest) {
  return verifyAdminSessionPayloadTokenEdge(request.cookies.get(ADMIN_STAFF_SESSION_COOKIE)?.value);
}
