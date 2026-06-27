import type { NextRequest } from "next/server";
import type { AdminSessionUser } from "@/features/auth/order-financial-permissions";
import {
  ADMIN_SESSION_MESSAGE,
  getAdminSessionSecret,
  verifyAdminSessionToken,
} from "@/lib/admin-auth/config";
import { ADMIN_SESSION_COOKIE, ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { verifyStaffSessionTokenEdge } from "@/lib/admin-auth/staff-session-edge";

async function getExpectedAdminSessionTokenEdge(): Promise<string | null> {
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ADMIN_SESSION_MESSAGE));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getAdminSessionFromRequestEdge(
  request: NextRequest,
): Promise<AdminSessionUser> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const expected = await getExpectedAdminSessionTokenEdge();
  const authenticated = verifyAdminSessionToken(token, expected);
  const staff = authenticated
    ? await verifyStaffSessionTokenEdge(request.cookies.get(ADMIN_STAFF_SESSION_COOKIE)?.value)
    : null;

  return {
    authenticated,
    employeeId: staff?.employeeId ?? null,
    role: staff?.role ?? null,
  };
}
