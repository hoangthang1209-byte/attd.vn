import { ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/admin-auth/constants";

export const ADMIN_SESSION_MESSAGE = "attd-admin-session:v1";

export function getConfiguredAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  const token = process.env.ADMIN_ACCESS_TOKEN?.trim();
  return password || token || null;
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getConfiguredAdminPassword());
}

export function isAdminAuthFailClosed(): boolean {
  return process.env.NODE_ENV === "production" && !isAdminAuthConfigured();
}

export function getAdminAuthStatusMessage(): string | null {
  if (isAdminAuthFailClosed()) {
    return "ADMIN_PASSWORD chưa được cấu hình — admin bị khóa trong production.";
  }
  if (!isAdminAuthConfigured() && process.env.NODE_ENV === "development") {
    return "Thiếu ADMIN_PASSWORD trong .env — đặt mật khẩu admin để đăng nhập.";
  }
  return null;
}

export function getAdminSessionSecret(): string | null {
  const password = getConfiguredAdminPassword();
  if (!password) return null;
  return process.env.ADMIN_SESSION_SECRET?.trim() || password;
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifyAdminSessionToken(token: string | undefined | null, expected: string | null): boolean {
  if (!token || !expected) return false;
  if (isAdminAuthFailClosed()) return false;
  return timingSafeEqualString(token, expected);
}

export function verifyAdminPassword(input: string, configured: string | null): boolean {
  if (!configured) return false;
  return timingSafeEqualString(input, configured);
}
