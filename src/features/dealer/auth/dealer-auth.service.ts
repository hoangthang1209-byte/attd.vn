import type { DealerUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  hashAdminPassword,
  validatePasswordStrength,
  verifyAdminPasswordHash,
} from "@/lib/admin-auth/password";
import { normalizeDealerEmail } from "@/features/dealer/dealer-validation";
import { createDealerActivity } from "@/features/dealer/services/dealer-activity.service";
import {
  buildB2BPortalSessionPayload,
  createB2BPortalSessionToken,
} from "@/features/dealer/auth/dealer-session";

export type PortalLoginResult =
  | {
      ok: true;
      token: string;
      companyName: string;
      companyStatus: string;
      userName: string;
      message: string;
    }
  | { ok: false; message: string; status: number };

export async function loginDealerPortalUser(
  email: string,
  password: string,
): Promise<PortalLoginResult> {
  const normalized = normalizeDealerEmail(email);
  const trimmedPassword = password.trim();

  if (!trimmedPassword) {
    return { ok: false, message: "Vui lòng nhập mật khẩu.", status: 400 };
  }

  const user = await prisma.dealerUser.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
      loginDisabledReason: true,
      dealerCompany: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!user) {
    return { ok: false, message: "Email hoặc mật khẩu không đúng.", status: 401 };
  }

  if (user.status === "DISABLED") {
    return {
      ok: false,
      message: user.loginDisabledReason ?? "Tài khoản B2B đã bị vô hiệu. Liên hệ ATTD để được hỗ trợ.",
      status: 401,
    };
  }

  const companyStatus = user.dealerCompany.status;
  if (companyStatus === "REJECTED" || companyStatus === "SUSPENDED") {
    return {
      ok: false,
      message:
        companyStatus === "REJECTED"
          ? "Hồ sơ B2B đã bị từ chối. Liên hệ ATTD để được hỗ trợ."
          : "Tài khoản B2B đang tạm ngưng. Liên hệ ATTD để được hỗ trợ.",
      status: 403,
    };
  }

  if (!user.passwordHash) {
    return {
      ok: false,
      message: "Tài khoản chưa có mật khẩu. Vui lòng liên hệ ATTD để được cấp mật khẩu tạm thời.",
      status: 401,
    };
  }

  const valid = await verifyAdminPasswordHash(trimmedPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, message: "Email hoặc mật khẩu không đúng.", status: 401 };
  }

  const token = createB2BPortalSessionToken(
    buildB2BPortalSessionPayload(user.dealerCompany.id, user.id, user.role),
  );
  if (!token) {
    return { ok: false, message: "Không thể tạo phiên đăng nhập.", status: 500 };
  }

  const now = new Date();
  await prisma.dealerUser.update({
    where: { id: user.id },
    data: {
      lastLoginAt: now,
      status: user.status === "INVITED" ? "ACTIVE" : user.status,
    },
  });

  await createDealerActivity({
    dealerCompanyId: user.dealerCompany.id,
    dealerUserId: user.id,
    type: "LOGIN",
    title: "Đăng nhập cổng B2B",
    description: user.email,
  });

  return {
    ok: true,
    token,
    companyName: user.dealerCompany.name,
    companyStatus,
    userName: user.name,
    message:
      companyStatus === "APPROVED"
        ? "Đăng nhập thành công."
        : "Đăng nhập thành công. Hồ sơ B2B đang chờ duyệt.",
  };
}

export async function setDealerUserPassword(
  userId: string,
  password: string,
): Promise<{ id: string; email: string; passwordSetAt: string }> {
  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    throw new Error(strengthError);
  }

  const existing = await prisma.dealerUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, dealerCompanyId: true, status: true },
  });
  if (!existing) {
    throw new Error("Không tìm thấy người dùng đại lý.");
  }
  if (existing.status === "DISABLED") {
    throw new Error("Không thể đặt mật khẩu cho tài khoản đã vô hiệu.");
  }

  const passwordHash = await hashAdminPassword(password);
  const now = new Date();

  const updated = await prisma.dealerUser.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordSetAt: now,
      invitedAt: existing.status === "INVITED" ? now : undefined,
    },
    select: { id: true, email: true, passwordSetAt: true },
  });

  await createDealerActivity({
    dealerCompanyId: existing.dealerCompanyId,
    dealerUserId: userId,
    type: "UPDATED",
    title: "Đặt mật khẩu tạm thời",
    description: updated.email,
  });

  return {
    id: updated.id,
    email: updated.email,
    passwordSetAt: updated.passwordSetAt!.toISOString(),
  };
}

export type ResolvedPortalSession = {
  dealerUserId: string;
  dealerCompanyId: string;
  role: DealerUserRole;
  userName: string;
  userEmail: string;
  companyName: string;
  companyStatus: string;
  companyLevel: string;
  companyType: string;
  priceGroupId: string | null;
  priceGroupName: string | null;
};

export async function resolvePortalSessionFromPayload(payload: {
  dealerUserId: string;
  dealerCompanyId: string;
}): Promise<ResolvedPortalSession | null> {
  const user = await prisma.dealerUser.findFirst({
    where: {
      id: payload.dealerUserId,
      dealerCompanyId: payload.dealerCompanyId,
      status: { not: "DISABLED" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dealerCompany: {
        select: {
          id: true,
          name: true,
          status: true,
          level: true,
          type: true,
          priceGroupId: true,
          priceGroup: { select: { name: true } },
        },
      },
    },
  });

  if (!user) return null;
  if (user.dealerCompany.status === "REJECTED" || user.dealerCompany.status === "SUSPENDED") {
    return null;
  }

  return {
    dealerUserId: user.id,
    dealerCompanyId: user.dealerCompany.id,
    role: user.role,
    userName: user.name,
    userEmail: user.email,
    companyName: user.dealerCompany.name,
    companyStatus: user.dealerCompany.status,
    companyLevel: user.dealerCompany.level,
    companyType: user.dealerCompany.type,
    priceGroupId: user.dealerCompany.priceGroupId,
    priceGroupName: user.dealerCompany.priceGroup?.name ?? null,
  };
}
