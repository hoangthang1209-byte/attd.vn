import type { NextRequest } from "next/server";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import {
  decodeStaffSessionPayload,
  splitStaffSessionToken,
  STAFF_SESSION_MESSAGE_PREFIX,
  type AdminStaffSessionPayload,
} from "@/lib/admin-auth/staff-session.shared";

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function signStaffPayloadPartEdge(payloadPart: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${STAFF_SESSION_MESSAGE_PREFIX}${payloadPart}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyStaffSessionTokenEdge(
  token: string | undefined | null,
): Promise<AdminStaffSessionPayload | null> {
  if (!token) return null;
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const parts = splitStaffSessionToken(token);
  if (!parts) return null;

  const expected = await signStaffPayloadPartEdge(parts.payloadPart, secret);
  if (!timingSafeEqualString(parts.signature, expected)) return null;

  return decodeStaffSessionPayload(parts.payloadPart);
}

export async function getStaffSessionFromRequestEdge(
  request: NextRequest,
): Promise<AdminStaffSessionPayload | null> {
  return verifyStaffSessionTokenEdge(request.cookies.get(ADMIN_STAFF_SESSION_COOKIE)?.value);
}
