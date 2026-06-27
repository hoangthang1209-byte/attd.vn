import { PrismaClient } from "@prisma/client";
import { SYSTEM_ROLE_SEEDS } from "../src/features/auth/admin-role-defaults";

const prisma = new PrismaClient();

async function main() {
  let rolesSeeded = 0;
  let rolesUpdated = 0;
  let grantsSeeded = 0;
  let grantsSkipped = 0;

  const permissions = await prisma.adminPermission.findMany();
  const permissionByCode = new Map(permissions.map((p) => [p.code, p]));

  for (const roleSeed of SYSTEM_ROLE_SEEDS) {
    let role = await prisma.adminRole.findUnique({ where: { code: roleSeed.code } });
    if (role) {
      role = await prisma.adminRole.update({
        where: { code: roleSeed.code },
        data: {
          name: roleSeed.name,
          description: roleSeed.description,
          sortOrder: roleSeed.sortOrder,
          isSystem: true,
        },
      });
      rolesUpdated += 1;
    } else {
      role = await prisma.adminRole.create({
        data: {
          code: roleSeed.code,
          name: roleSeed.name,
          description: roleSeed.description,
          sortOrder: roleSeed.sortOrder,
          isSystem: true,
          isActive: true,
        },
      });
      rolesSeeded += 1;
    }

    if (!role.isSystem) {
      console.log(`skipped custom role grants: ${role.code}`);
      continue;
    }

    for (const grant of roleSeed.grants) {
      const permission = permissionByCode.get(grant.permissionCode);
      if (!permission) {
        console.warn(`missing permission code: ${grant.permissionCode}`);
        continue;
      }

      const existing = await prisma.adminRolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
      });

      if (existing) {
        if (role.isSystem) {
          await prisma.adminRolePermission.update({
            where: { id: existing.id },
            data: { scope: grant.scope },
          });
        }
        grantsSkipped += 1;
        continue;
      }

      await prisma.adminRolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
          scope: grant.scope,
        },
      });
      grantsSeeded += 1;
    }
  }

  console.log(`roles seeded: ${rolesSeeded}`);
  console.log(`roles updated: ${rolesUpdated}`);
  console.log(`role-permission grants seeded: ${grantsSeeded}`);
  console.log(`role-permission grants skipped/existing: ${grantsSkipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
