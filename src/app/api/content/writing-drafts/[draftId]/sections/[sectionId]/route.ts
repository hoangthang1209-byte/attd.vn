import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  parseSectionLocks,
  unlockSection,
} from "@/features/writing-engine/services/writing-section-lock.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";

type RouteContext = { params: Promise<{ draftId: string; sectionId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId, sectionId } = await context.params;
  const store = createPrismaGenerationOrchestratorStore();
  const draft = await store.findDraft(draftId);
  if (!draft) return NextResponse.json({ message: "Draft not found" }, { status: 404 });

  const locks = unlockSection(parseSectionLocks(draft.sectionLocks), sectionId);
  await store.updateDraft(draftId, { sectionLocks: locks });
  return NextResponse.json({ locks, message: "Section unlocked" });
}
