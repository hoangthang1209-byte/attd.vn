import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { adminSessionCookieOptions } from "@/lib/admin-auth/config";
import {
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth/session-node";
import {
  buildLegacySessionPayload,
  buildOwnerSessionPayload,
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";
import {
  getAdminAuthStatusMessage,
  isAdminAuthConfigured,
  isAdminAuthFailClosed,
} from "@/lib/admin-auth/config";
import { authenticateAdminUser } from "@/features/admin-users/admin-user.service";
import { normalizeAdminUsername } from "@/lib/admin-auth/password";
import {
  loadSessionGrantsForRole,
  resolveLegacyEmployeeRoleGrants,
} from "@/features/admin-roles/admin-role.service";
import { logAdminAuditEvent } from "@/features/auth/admin-audit-log";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";

function loginError(reason: string) {
  switch (reason) {
    case "locked":
      return "Tài khoản đã bị khóa.";
    case "employee_inactive":
      return "Nhân viên liên kết đã ngừng hoạt động.";
    default:
      return "Tên đăng nhập hoặc mật khẩu không đúng.";
  }
}

export async function POST(req: NextRequest) {
  if (isAdminAuthFailClosed()) {
    return NextResponse.json(
      {
        message:
          "Admin login bị khóa: thiếu ADMIN_PASSWORD trong môi trường production.",
      },
      { status: 503 },
    );
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        message:
          getAdminAuthStatusMessage() ??
          "Thiếu ADMIN_PASSWORD — thêm vào .env.local để bật admin login.",
      },
      { status: 503 },
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
  const usernameRaw = typeof record.username === "string" ? record.username.trim() : "";
  const employeeId =
    typeof record.employeeId === "string" && record.employeeId.trim()
      ? record.employeeId.trim()
      : null;

  const sessionToken = createAdminSessionToken();
  if (!sessionToken) {
    return NextResponse.json({ message: "Không thể tạo phiên đăng nhập." }, { status: 500 });
  }

  let identityPayload;

  if (usernameRaw) {
    const auth = await authenticateAdminUser(usernameRaw, password);
    if (!auth.ok) {
      return NextResponse.json({ message: loginError(auth.reason) }, { status: 401 });
    }

    const grants: SessionPermissionGrant[] = auth.user.role
      ? auth.user.role.permissions
          .filter((grant) => grant.scope !== "NONE")
          .map((grant) => [grant.permission.code, grant.scope] as SessionPermissionGrant)
      : [];

    identityPayload = buildUserSessionPayload({
      userId: auth.user.id,
      username: auth.user.username,
      employeeId: auth.user.employeeId,
      roleId: auth.user.roleId,
      roleCode: auth.user.role?.code ?? null,
      permissions: grants,
    });
  } else if (verifyAdminPassword(password)) {
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
      const linked = await prisma.adminUser.findUnique({
        where: { employeeId: employee.id },
        select: { id: true, isActive: true },
      });
      if (linked?.isActive) {
        return NextResponse.json(
          {
            message:
              "Nhân viên đã có tài khoản. Vui lòng đăng nhập bằng tên đăng nhập cá nhân.",
          },
          { status: 400 },
        );
      }

      const resolved = await resolveLegacyEmployeeRoleGrants(employee.role);
      identityPayload = buildLegacySessionPayload({
        employeeId: employee.id,
        role: employee.role,
        roleId: resolved.roleId,
        roleCode: resolved.roleCode,
        permissions: resolved.grants,
      });
      logAdminAuditEvent({
        action: "login_owner",
        employeeId: employee.id,
        detail: { legacy: true },
      });
    } else {
      identityPayload = buildOwnerSessionPayload();
      logAdminAuditEvent({ action: "login_owner", detail: { mode: "owner" } });
    }
  } else {
    return NextResponse.json(
      { message: "Tên đăng nhập hoặc mật khẩu không đúng." },
      { status: 401 },
    );
  }

  const identityToken = createIdentitySessionToken(identityPayload);
  if (!identityToken) {
    return NextResponse.json({ message: "Không thể tạo phiên nhân viên." }, { status: 500 });
  }

  const cookieOptions = adminSessionCookieOptions();
  const response = NextResponse.json({
    ok: true,
    mode: identityPayload.mode,
    roleCode: identityPayload.roleCode,
    employeeId: identityPayload.employeeId,
    username: identityPayload.username,
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, cookieOptions);
  response.cookies.set(ADMIN_STAFF_SESSION_COOKIE, identityToken, cookieOptions);
  return response;
}
