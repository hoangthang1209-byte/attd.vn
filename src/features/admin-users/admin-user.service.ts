import { prisma } from "@/lib/prisma";
import {
  hashAdminPassword,
  normalizeAdminUsername,
  validatePasswordStrength,
  verifyAdminPasswordHash,
} from "@/lib/admin-auth/password";
import { logAdminAuditEvent } from "@/features/auth/admin-audit-log";

export class AdminUserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminUserValidationError";
  }
}

export type AdminUserListRecord = {
  id: string;
  username: string;
  employeeId: string | null;
  employeeName: string | null;
  roleId: string | null;
  roleCode: string | null;
  roleName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

function mapUserRow(row: {
  id: string;
  username: string;
  employeeId: string | null;
  roleId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  employee: { fullName: string } | null;
  role: { code: string; name: string } | null;
}): AdminUserListRecord {
  return {
    id: row.id,
    username: row.username,
    employeeId: row.employeeId,
    employeeName: row.employee?.fullName ?? null,
    roleId: row.roleId,
    roleCode: row.role?.code ?? null,
    roleName: row.role?.name ?? null,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAdminUsers(): Promise<AdminUserListRecord[]> {
  const rows = await prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { username: "asc" }],
    include: {
      employee: { select: { fullName: true } },
      role: { select: { code: true, name: true } },
    },
  });
  return rows.map(mapUserRow);
}

export async function getAdminUserByUsername(username: string) {
  return prisma.adminUser.findUnique({
    where: { username: normalizeAdminUsername(username) },
    include: {
      employee: true,
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });
}

export async function authenticateAdminUser(username: string, password: string) {
  const user = await getAdminUserByUsername(username);
  if (!user) {
    logAdminAuditEvent({ action: "login_failed", detail: { username: normalizeAdminUsername(username) } });
    return { ok: false as const, reason: "invalid_credentials" as const };
  }
  if (!user.isActive) {
    logAdminAuditEvent({ action: "login_failed", userId: user.id, detail: { reason: "locked" } });
    return { ok: false as const, reason: "locked" as const };
  }
  if (user.employee && !user.employee.isActive) {
    logAdminAuditEvent({
      action: "login_failed",
      userId: user.id,
      detail: { reason: "employee_inactive" },
    });
    return { ok: false as const, reason: "employee_inactive" as const };
  }
  if (!user.role || !user.role.isActive) {
    return { ok: false as const, reason: "locked" as const };
  }

  const valid = await verifyAdminPasswordHash(password, user.passwordHash);
  if (!valid) {
    logAdminAuditEvent({ action: "login_failed", userId: user.id, detail: { reason: "invalid_credentials" } });
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logAdminAuditEvent({ action: "login_success", userId: user.id, employeeId: user.employeeId });

  return { ok: true as const, user };
}

export async function createAdminUser(input: {
  username: string;
  password: string;
  employeeId?: string | null;
  roleId: string;
  isActive?: boolean;
}) {
  const username = normalizeAdminUsername(input.username);
  if (!username) throw new AdminUserValidationError("Tên đăng nhập không hợp lệ.");
  const passwordError = validatePasswordStrength(input.password);
  if (passwordError) throw new AdminUserValidationError(passwordError);

  const role = await prisma.adminRole.findUnique({ where: { id: input.roleId } });
  if (!role || !role.isActive) throw new AdminUserValidationError("Vai trò không hợp lệ.");

  if (input.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee || !employee.isActive) {
      throw new AdminUserValidationError("Nhân viên liên kết không hợp lệ.");
    }
    const linked = await prisma.adminUser.findUnique({ where: { employeeId: input.employeeId } });
    if (linked) throw new AdminUserValidationError("Nhân viên đã có tài khoản.");
  }

  const passwordHash = await hashAdminPassword(input.password);
  const user = await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      employeeId: input.employeeId ?? null,
      roleId: input.roleId,
      isActive: input.isActive !== false,
      passwordChangedAt: new Date(),
    },
    include: {
      employee: { select: { fullName: true } },
      role: { select: { code: true, name: true } },
    },
  });

  logAdminAuditEvent({ action: "user_created", userId: user.id, detail: { username } });
  return mapUserRow(user);
}

export async function updateAdminUser(
  userId: string,
  input: {
    employeeId?: string | null;
    roleId?: string;
    isActive?: boolean;
  },
  actorUserId?: string | null,
) {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw new AdminUserValidationError("Không tìm thấy tài khoản.");

  if (user.role?.code === "OWNER" && input.isActive === false) {
    const ownerCount = await prisma.adminUser.count({
      where: {
        isActive: true,
        role: { code: "OWNER" },
      },
    });
    if (ownerCount <= 1) {
      throw new AdminUserValidationError("Không thể khóa tài khoản Chủ hệ thống cuối cùng.");
    }
  }

  if (input.roleId) {
    const role = await prisma.adminRole.findUnique({ where: { id: input.roleId } });
    if (!role || !role.isActive) throw new AdminUserValidationError("Vai trò không hợp lệ.");
    if (user.role?.code === "OWNER" && role.code !== "OWNER" && actorUserId === userId) {
      throw new AdminUserValidationError("Không thể tự hạ quyền Chủ hệ thống của chính mình.");
    }
  }

  if (input.employeeId) {
    const linked = await prisma.adminUser.findFirst({
      where: { employeeId: input.employeeId, NOT: { id: userId } },
    });
    if (linked) throw new AdminUserValidationError("Nhân viên đã có tài khoản khác.");
  }

  const updated = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      employeeId: input.employeeId === undefined ? undefined : input.employeeId,
      roleId: input.roleId,
      isActive: input.isActive,
    },
    include: {
      employee: { select: { fullName: true } },
      role: { select: { code: true, name: true } },
    },
  });

  logAdminAuditEvent({
    action: input.isActive === false ? "user_locked" : input.isActive === true ? "user_unlocked" : "user_updated",
    userId: updated.id,
    actorUserId,
  });

  return mapUserRow(updated);
}

export async function resetAdminUserPassword(userId: string, password: string, actorUserId?: string | null) {
  const passwordError = validatePasswordStrength(password);
  if (passwordError) throw new AdminUserValidationError(passwordError);

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) throw new AdminUserValidationError("Không tìm thấy tài khoản.");

  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash: await hashAdminPassword(password),
      passwordChangedAt: new Date(),
    },
  });

  logAdminAuditEvent({ action: "password_reset", userId, actorUserId });
}

export async function countActiveOwnerUsers(): Promise<number> {
  return prisma.adminUser.count({
    where: { isActive: true, role: { code: "OWNER" } },
  });
}
