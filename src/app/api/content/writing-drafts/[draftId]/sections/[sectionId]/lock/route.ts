import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  lockSection,
  parseSectionLocks,
  unlockSection,
} from "@/features/writing-engine/services/writing-section-lock.service";
import { createPrismaGenerationOrchestratorStore } from "@/features/writing-engine/services/writing-generation.wiring";
import type { WritingSectionLockReason } from "@/features/writing-engine/writing-engine.types";

type RouteContext = { params: Promise<{ draftId: string; sectionId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { draftId, sectionId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  const store = createPrismaGenerationOrchestratorStore();
  const draft = await store.findDraft(draftId);
  if (!draft) return NextResponse.json({ message: "Draft not found" }, { status: 404 });

  const reason = (typeof raw.reason === "string" ? raw.reason : "MANUAL_LOCK") as WritingSectionLockReason;
  const locks = lockSection(
    parseSectionLocks(draft.sectionLocks),
    sectionId,
    reason,
    permission.user.userId ?? permission.user.username ?? null,
    typeof raw.note === "string" ? raw.note : null
  );

  await store.updateDraft(draftId, { sectionLocks: locks });
  return NextResponse.json({ locks, message: "Section locked" });
}
