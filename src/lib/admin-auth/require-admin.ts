import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-auth/constants";
import {
  getSessionTokenFromCookies,
  getSessionTokenFromRequest,
  verifyAdminSessionCookie,
} from "@/lib/admin-auth/session-node";

export async function requireAdmin(nextPath?: string): Promise<void> {
  const cookieStore = await getSessionTokenFromCookies();
  if (!verifyAdminSessionCookie(cookieStore)) {
    const loginUrl = nextPath
      ? `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`
      : ADMIN_LOGIN_PATH;
    redirect(loginUrl);
  }
}

export function requireAdminApi(request: NextRequest): NextResponse | null {
  if (verifyAdminSessionCookie(getSessionTokenFromRequest(request))) {
    return null;
  }
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function requireAdminApiFromCookies(): Promise<NextResponse | null> {
  if (verifyAdminSessionCookie(await getSessionTokenFromCookies())) {
    return null;
  }
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
