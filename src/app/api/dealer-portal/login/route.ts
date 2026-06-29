import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  B2B_PORTAL_SESSION_COOKIE,
  b2bPortalSessionCookieOptions,
} from "@/features/dealer/auth/dealer-session";
import { loginDealerPortalUser } from "@/features/dealer/auth/dealer-auth.service";

/** @deprecated Use POST /api/portal/auth/login */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof raw.email === "string" ? raw.email : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  const result = await loginDealerPortalUser(email, password);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(B2B_PORTAL_SESSION_COOKIE, result.token, b2bPortalSessionCookieOptions());

  return NextResponse.json({
    ok: true,
    companyName: result.companyName,
    companyStatus: result.companyStatus,
    userName: result.userName,
    message: result.message,
  });
}
