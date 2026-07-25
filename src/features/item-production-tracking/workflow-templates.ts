import type { ItemProductionStageKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ITEM_PRODUCTION_DEFAULT_WEIGHTS,
  ITEM_PRODUCTION_STAGE_LABELS,
  SYSTEM_WORKFLOW_TEMPLATES,
} from "@/features/item-production-tracking/config";

export async function ensureSystemWorkflowTemplates() {
  for (const def of SYSTEM_WORKFLOW_TEMPLATES) {
    const existing = await prisma.itemProductionWorkflowTemplate.findUnique({
      where: { code: def.code },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.itemProductionWorkflowTemplate.create({
      data: {
        code: def.code,
        name: def.name,
        description: def.description,
        isSystem: true,
        isActive: true,
        sortOrder: def.sortOrder,
        steps: {
          create: def.stageKeys.map((stageKey, index) => ({
            stageKey,
            label: ITEM_PRODUCTION_STAGE_LABELS[stageKey],
            sequence: (index + 1) * 10,
            weight: ITEM_PRODUCTION_DEFAULT_WEIGHTS[stageKey],
            isApplicable: true,
          })),
        },
      },
    });
  }
}

export async function listWorkflowTemplates() {
  await ensureSystemWorkflowTemplates();
  return prisma.itemProductionWorkflowTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { steps: { orderBy: { sequence: "asc" } } },
  });
}

export function resolveTemplateStageKeys(
  stageKeys: ItemProductionStageKey[],
  customEnabledKeys?: ItemProductionStageKey[],
): ItemProductionStageKey[] {
  if (customEnabledKeys && customEnabledKeys.length > 0) {
    const enabled = new Set(customEnabledKeys);
    return stageKeys.filter((k) => enabled.has(k));
  }
  return stageKeys;
}
