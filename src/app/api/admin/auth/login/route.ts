import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { adminSessionCookieOptions } from "@/lib/admin-auth/config";
import {
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth/session-node";
import {
  createStaffSessionToken,
  resolveStaffLoginFromEmployee,
} from "@/lib/admin-auth/staff-session-node";
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

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const password = typeof record.password === "string" ? record.password : "";
  const employeeId =
    typeof record.employeeId === "string" && record.employeeId.trim()
      ? record.employeeId.trim()
      : null;

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ message: "Mật khẩu không đúng." }, { status: 401 });
  }

  const sessionToken = createAdminSessionToken();
  if (!sessionToken) {
    return NextResponse.json({ message: "Không thể tạo phiên đăng nhập." }, { status: 500 });
  }

  let staffPayload = resolveStaffLoginFromEmployee({
    employeeId: null,
    role: null,
    isActive: true,
  });

  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, role: true, isActive: true },
    });
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { message: "Nhân viên không hợp lệ hoặc đã ngừng hoạt động." },
        { status: 400 },
      );
    }
    staffPayload = resolveStaffLoginFromEmployee({
      employeeId: employee.id,
      role: employee.role,
      isActive: employee.isActive,
    });
  }

  const staffToken = createStaffSessionToken(staffPayload);
  if (!staffToken) {
    return NextResponse.json({ message: "Không thể tạo phiên nhân viên." }, { status: 500 });
  }

  const cookieOptions = adminSessionCookieOptions();
  const response = NextResponse.json({
    ok: true,
    role: staffPayload.role,
    employeeId: staffPayload.employeeId,
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, cookieOptions);
  response.cookies.set(ADMIN_STAFF_SESSION_COOKIE, staffToken, cookieOptions);
  return response;
}
