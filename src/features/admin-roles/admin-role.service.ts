import type { PermissionScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";
import { EMPLOYEE_ROLE_TO_ADMIN_ROLE_CODE } from "@/features/auth/admin-role-defaults";

export async function loadSessionGrantsForRole(
  roleId: string | null | undefined,
): Promise<SessionPermissionGrant[]> {
  if (!roleId) return [];
  const grants = await prisma.adminRolePermission.findMany({
    where: { roleId, scope: { not: "NONE" } },
    include: { permission: { select: { code: true } } },
  });
  return grants.map((grant) => [grant.permission.code, grant.scope] as SessionPermissionGrant);
}

export async function resolveAdminRoleIdByCode(code: string): Promise<string | null> {
  const role = await prisma.adminRole.findUnique({
    where: { code },
    select: { id: true, isActive: true },
  });
  if (!role || !role.isActive) return null;
  return role.id;
}

export async function resolveLegacyEmployeeRoleGrants(
  employeeRole: string | null | undefined,
): Promise<{ roleId: string | null; roleCode: string | null; grants: SessionPermissionGrant[] }> {
  const roleCode = employeeRole ? EMPLOYEE_ROLE_TO_ADMIN_ROLE_CODE[employeeRole] ?? "VIEWER" : "VIEWER";
  const roleId = await resolveAdminRoleIdByCode(roleCode);
  const grants = await loadSessionGrantsForRole(roleId);
  return { roleId, roleCode, grants };
}

export type AdminRoleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  userCount: number;
};

export async function listAdminRoles(): Promise<AdminRoleRecord[]> {
  const rows = await prisma.adminRole.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    userCount: row._count.users,
  }));
}

export async function getAdminRoleDetail(roleId: string) {
  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
    include: {
      _count: { select: { users: true } },
      permissions: {
        include: { permission: true },
        orderBy: { permission: { sortOrder: "asc" } },
      },
    },
  });
  if (!role) return null;
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    sortOrder: role.sortOrder,
    userCount: role._count.users,
    permissions: role.permissions.map((grant) => ({
      permissionId: grant.permissionId,
      code: grant.permission.code,
      module: grant.permission.module,
      action: grant.permission.action,
      name: grant.permission.name,
      scope: grant.scope,
    })),
  };
}

export async function updateAdminRolePermissions(
  roleId: string,
  grants: Array<{ permissionId: string; scope: PermissionScope }>,
) {
  const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Không tìm thấy vai trò.");
  if (role.code === "OWNER") {
    throw new Error("Không thể thay đổi quyền của vai trò Chủ hệ thống.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.adminRolePermission.deleteMany({ where: { roleId } });
    if (grants.length > 0) {
      await tx.adminRolePermission.createMany({
        data: grants
          .filter((grant) => grant.scope !== "NONE")
          .map((grant) => ({
            roleId,
            permissionId: grant.permissionId,
            scope: grant.scope,
          })),
      });
    }
    await tx.adminRole.update({
      where: { id: roleId },
      data: { updatedAt: new Date() },
    });
  });

  return getAdminRoleDetail(roleId);
}

export async function createCustomAdminRole(input: {
  code: string;
  name: string;
  description?: string | null;
}) {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("Mã vai trò không hợp lệ.");
  const existing = await prisma.adminRole.findUnique({ where: { code } });
  if (existing) throw new Error("Mã vai trò đã tồn tại.");

  const role = await prisma.adminRole.create({
    data: {
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isSystem: false,
      isActive: true,
      sortOrder: 500,
    },
  });
  return getAdminRoleDetail(role.id);
}

export async function updateAdminRoleMeta(
  roleId: string,
  input: { name?: string; description?: string | null; isActive?: boolean },
) {
  const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Không tìm thấy vai trò.");
  if (role.isSystem && role.code !== "OWNER" && input.isActive === false && role.code === "OWNER") {
    throw new Error("Không thể khóa vai trò Chủ hệ thống.");
  }

  if (input.isActive === false) {
    const activeUsers = await prisma.adminUser.count({
      where: { roleId, isActive: true },
    });
    if (activeUsers > 0) {
      throw new Error("Không thể ngừng hoạt động vai trò đang được gán cho tài khoản.");
    }
  }

  await prisma.adminRole.update({
    where: { id: roleId },
    data: {
      name: input.name?.trim() || undefined,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      isActive: input.isActive,
    },
  });
  return getAdminRoleDetail(roleId);
}
