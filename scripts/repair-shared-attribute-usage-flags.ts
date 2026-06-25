#!/usr/bin/env npx tsx
/**
 * Safe maintenance: repair ProductAttribute usage flags for known stable codes.
 * Does NOT modify assignments, options, or variants.
 *
 * Dry-run by default. Pass --apply to persist changes.
 *
 *   npx tsx scripts/repair-shared-attribute-usage-flags.ts
 *   npx tsx scripts/repair-shared-attribute-usage-flags.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_FLAGS: Record<
  string,
  { isVariantAttribute: boolean; isSpecificationAttribute: boolean }
> = {
  COLOR: { isVariantAttribute: true, isSpecificationAttribute: false },
  SIZE: { isVariantAttribute: true, isSpecificationAttribute: false },
  MATERIAL: { isVariantAttribute: false, isSpecificationAttribute: true },
  FIT: { isVariantAttribute: false, isSpecificationAttribute: true },
  GENDER: { isVariantAttribute: false, isSpecificationAttribute: true },
  COLLAR: { isVariantAttribute: false, isSpecificationAttribute: true },
  SLEEVE: { isVariantAttribute: false, isSpecificationAttribute: true },
  FABTYPE: { isVariantAttribute: false, isSpecificationAttribute: true },
};

type PlannedChange = {
  id: string;
  code: string;
  name: string;
  before: { isVariantAttribute: boolean; isSpecificationAttribute: boolean };
  after: { isVariantAttribute: boolean; isSpecificationAttribute: boolean };
};

export async function repairSharedAttributeUsageFlags(options?: {
  apply?: boolean;
}): Promise<{ planned: PlannedChange[]; updated: number }> {
  const apply = options?.apply === true;
  const codes = Object.keys(TARGET_FLAGS);
  const attributes = await prisma.productAttribute.findMany({
    where: { code: { in: codes } },
    select: {
      id: true,
      code: true,
      name: true,
      isVariantAttribute: true,
      isSpecificationAttribute: true,
    },
    orderBy: { code: "asc" },
  });

  const planned: PlannedChange[] = [];

  for (const attribute of attributes) {
    const target = TARGET_FLAGS[attribute.code];
    if (!target) continue;
    const needsUpdate =
      attribute.isVariantAttribute !== target.isVariantAttribute ||
      attribute.isSpecificationAttribute !== target.isSpecificationAttribute;
    if (!needsUpdate) continue;
    planned.push({
      id: attribute.id,
      code: attribute.code,
      name: attribute.name,
      before: {
        isVariantAttribute: attribute.isVariantAttribute,
        isSpecificationAttribute: attribute.isSpecificationAttribute,
      },
      after: target,
    });
  }

  const missingCodes = codes.filter((code) => !attributes.some((row) => row.code === code));
  if (missingCodes.length > 0) {
    console.log(`Skipped missing attribute codes: ${missingCodes.join(", ")}`);
  }

  if (planned.length === 0) {
    console.log("No attribute usage-flag changes required.");
    return { planned, updated: 0 };
  }

  console.log(`${apply ? "Applying" : "Planned"} ${planned.length} attribute usage-flag change(s):`);
  for (const change of planned) {
    console.log(
      `- ${change.code} (${change.name}): variant ${change.before.isVariantAttribute} -> ${change.after.isVariantAttribute}, spec ${change.before.isSpecificationAttribute} -> ${change.after.isSpecificationAttribute}`,
    );
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to persist these changes.");
    return { planned, updated: 0 };
  }

  let updated = 0;
  for (const change of planned) {
    await prisma.productAttribute.update({
      where: { id: change.id },
      data: change.after,
    });
    updated += 1;
  }

  console.log(`\nRepair complete. Updated ${updated} attribute(s).`);
  return { planned, updated };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) {
    console.log("repairSharedAttributeUsageFlags — dry run (pass --apply to write changes)\n");
  } else {
    console.log("repairSharedAttributeUsageFlags — APPLY mode\n");
  }
  await repairSharedAttributeUsageFlags({ apply });
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
