import { createHmac } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_MESSAGE,
  getAdminSessionSecret,
  isAdminAuthConfigured,
  verifyAdminPassword as verifyPassword,
  verifyAdminSessionToken,
} from "@/lib/admin-auth/config";
import { ADMIN_SESSION_COOKIE, ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { verifyAdminSessionPayloadToken } from "@/lib/admin-auth/staff-session-node";

export function createAdminSessionToken(): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(ADMIN_SESSION_MESSAGE).digest("hex");
}

export function verifyAdminPassword(input: string): boolean {
  const configured = process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_ACCESS_TOKEN?.trim() || null;
  return verifyPassword(input, configured);
}

export function verifyAdminSessionCookie(token: string | undefined | null): boolean {
  return verifyAdminSessionToken(token, createAdminSessionToken());
}

export function getSessionTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function getSessionTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export function isRequestAdminAuthenticated(request: NextRequest): boolean {
  if (verifyAdminSessionCookie(getSessionTokenFromRequest(request))) return true;
  return verifyAdminSessionPayloadToken(request.cookies.get(ADMIN_STAFF_SESSION_COOKIE)?.value) !== null;
}

export async function isCookieAdminAuthenticated(): Promise<boolean> {
  return verifyAdminSessionCookie(await getSessionTokenFromCookies());
}

export { isAdminAuthConfigured, isAdminAuthFailClosed, getAdminAuthStatusMessage, adminSessionCookieOptions } from "@/lib/admin-auth/config";
