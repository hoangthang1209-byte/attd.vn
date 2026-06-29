import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { DealerUserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getAdminSessionSecret } from "@/lib/admin-auth/config";

export const B2B_PORTAL_SESSION_COOKIE = "attd_b2b_portal_session";
export const B2B_PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const B2B_PORTAL_SESSION_MESSAGE = "attd-b2b-portal-session:v1";

export type B2BPortalSessionPayload = {
  v: 1;
  dealerUserId: string;
  dealerCompanyId: string;
  role: DealerUserRole;
  issuedAt: number;
  expiresAt: number;
};

function getPortalSessionSecret(): string | null {
  return getAdminSessionSecret();
}

function signPayload(encoded: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${B2B_PORTAL_SESSION_MESSAGE}:${encoded}`)
    .digest("hex");
}

export function createB2BPortalSessionToken(payload: B2BPortalSessionPayload): string | null {
  const secret = getPortalSessionSecret();
  if (!secret) return null;
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function verifyB2BPortalSessionToken(
  token: string | undefined | null,
): B2BPortalSessionPayload | null {
  if (!token) return null;
  const secret = getPortalSessionSecret();
  if (!secret) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signPayload(encoded, secret);
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as B2BPortalSessionPayload;
    if (
      payload.v !== 1 ||
      !payload.dealerUserId ||
      !payload.dealerCompanyId ||
      !payload.role
    ) {
      return null;
    }
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function b2bPortalSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: B2B_PORTAL_SESSION_MAX_AGE_SECONDS,
  };
}

export function buildB2BPortalSessionPayload(
  dealerCompanyId: string,
  dealerUserId: string,
  role: DealerUserRole,
): B2BPortalSessionPayload {
  const issuedAt = Date.now();
  return {
    v: 1,
    dealerCompanyId,
    dealerUserId,
    role,
    issuedAt,
    expiresAt: issuedAt + B2B_PORTAL_SESSION_MAX_AGE_SECONDS * 1000,
  };
}

export function getB2BPortalSessionTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(B2B_PORTAL_SESSION_COOKIE)?.value;
}

export async function getB2BPortalSessionTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(B2B_PORTAL_SESSION_COOKIE)?.value;
}

export async function getB2BPortalSessionPayloadFromCookies(): Promise<B2BPortalSessionPayload | null> {
  return verifyB2BPortalSessionToken(await getB2BPortalSessionTokenFromCookies());
}

export function getB2BPortalSessionPayloadFromRequest(
  request: NextRequest,
): B2BPortalSessionPayload | null {
  return verifyB2BPortalSessionToken(getB2BPortalSessionTokenFromRequest(request));
}
