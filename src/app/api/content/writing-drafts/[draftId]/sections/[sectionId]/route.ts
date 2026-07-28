import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  parseSectionLocks,
  unlockSection,
} from "@/features/writing-engine/services/writing-section-lock.service";
import {
  createPrismaGenerationOrchestratorStore,
} from "@/features/writing-engine/services/writing-generation.wiring";
import {
  saveHumanEditedSection,
  WritingGenerationError,
} from "@/features/writing-engine/services/writing-generation-orchestrator.service";

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
  const html = typeof raw.html === "string" ? raw.html : null;

  // Human edit save path used by WritingEnginePanel
  if (html != null) {
    try {
      const store = createPrismaGenerationOrchestratorStore();
      const result = await saveHumanEditedSection(
        {
          draftId,
          sectionId,
          html,
          plainText: typeof raw.plainText === "string" ? raw.plainText : undefined,
          lockAfterSave: raw.lockAfterSave !== false,
          editedBy: permission.user.userId ?? permission.user.username ?? null,
        },
        store,
      );
      return NextResponse.json({
        draft: result.draft,
        version: result.version,
        message: "Đã lưu section (human edit).",
      });
    } catch (err) {
      if (err instanceof WritingGenerationError) {
        return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
      }
      console.error("[POST writing-draft section save]", err);
      return NextResponse.json({ message: "Không lưu được section" }, { status: 500 });
    }
  }

  // Fallback: unlock-only
  const store = createPrismaGenerationOrchestratorStore();
  const draft = await store.findDraft(draftId);
  if (!draft) return NextResponse.json({ message: "Draft not found" }, { status: 404 });

  const locks = unlockSection(parseSectionLocks(draft.sectionLocks), sectionId);
  await store.updateDraft(draftId, { sectionLocks: locks });
  return NextResponse.json({ locks, message: "Section unlocked" });
}
