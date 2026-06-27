import { PrismaClient, type PermissionScope } from "@prisma/client";
import { ADMIN_PERMISSION_CATALOG } from "../src/features/auth/admin-permission-catalog";

const prisma = new PrismaClient();

async function main() {
  let seeded = 0;
  let updated = 0;

  for (const entry of ADMIN_PERMISSION_CATALOG) {
    const existing = await prisma.adminPermission.findUnique({ where: { code: entry.code } });
    if (existing) {
      await prisma.adminPermission.update({
        where: { code: entry.code },
        data: {
          module: entry.module,
          action: entry.action,
          name: entry.name,
          description: entry.description ?? null,
          sortOrder: entry.sortOrder,
        },
      });
      updated += 1;
    } else {
      await prisma.adminPermission.create({
        data: {
          code: entry.code,
          module: entry.module,
          action: entry.action,
          name: entry.name,
          description: entry.description ?? null,
          sortOrder: entry.sortOrder,
        },
      });
      seeded += 1;
    }
  }

  console.log(`permissions seeded: ${seeded}`);
  console.log(`permissions updated: ${updated}`);
  console.log(`permissions total catalog: ${ADMIN_PERMISSION_CATALOG.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
