import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  B2B_PORTAL_SESSION_COOKIE,
  b2bPortalSessionCookieOptions,
} from "@/features/dealer/auth/dealer-session";

export async function POST() {
  const cookieStore = await cookies();
  const options = b2bPortalSessionCookieOptions();
  cookieStore.set(B2B_PORTAL_SESSION_COOKIE, "", { ...options, maxAge: 0 });

  return NextResponse.json({ ok: true, message: "Đã đăng xuất." });
}
