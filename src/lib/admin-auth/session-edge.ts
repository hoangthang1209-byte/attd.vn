import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_MESSAGE,
  getAdminSessionSecret,
  verifyAdminSessionToken,
} from "@/lib/admin-auth/config";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth/constants";

let cachedExpectedToken: string | null | undefined;

async function createAdminSessionTokenEdge(): Promise<string | null> {
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ADMIN_SESSION_MESSAGE));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getExpectedSessionToken(): Promise<string | null> {
  if (cachedExpectedToken !== undefined) return cachedExpectedToken;
  cachedExpectedToken = await createAdminSessionTokenEdge();
  return cachedExpectedToken;
}

export async function isRequestAdminAuthenticatedEdge(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const expected = await getExpectedSessionToken();
  return verifyAdminSessionToken(token, expected);
}
