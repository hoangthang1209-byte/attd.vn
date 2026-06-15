import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { adminSessionCookieOptions } from "@/lib/admin-auth/config";
import {
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth/session-node";
import {
  getAdminAuthStatusMessage,
  isAdminAuthConfigured,
  isAdminAuthFailClosed,
} from "@/lib/admin-auth/config";

export async function POST(req: NextRequest) {
  if (isAdminAuthFailClosed()) {
    return NextResponse.json(
      {
        message:
          "Admin login bị khóa: thiếu ADMIN_PASSWORD trong môi trường production.",
      },
      { status: 503 }
    );
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        message:
          getAdminAuthStatusMessage() ??
          "Thiếu ADMIN_PASSWORD — thêm vào .env.local để bật admin login.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const password =
    body && typeof body === "object" && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ message: "Mật khẩu không đúng." }, { status: 401 });
  }

  const sessionToken = createAdminSessionToken();
  if (!sessionToken) {
    return NextResponse.json({ message: "Không thể tạo phiên đăng nhập." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, adminSessionCookieOptions());
  return response;
}
