import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  CONTENT_GENERATION_SECTION_TYPES,
  type ContentGenerationType,
} from "@/features/content-generation/contracts/generation.types";
import { createContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

function parseSectionType(raw: unknown): ContentGenerationType {
  if (typeof raw === "string" && (CONTENT_GENERATION_SECTION_TYPES as string[]).includes(raw)) {
    return raw as ContentGenerationType;
  }
  return "SECTION_DRAFT";
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const topicId = typeof raw.topicId === "string" ? raw.topicId.trim() : "";
  const writingPlanId = typeof raw.writingPlanId === "string" ? raw.writingPlanId.trim() : "";
  const sectionId = typeof raw.sectionId === "string" ? raw.sectionId.trim() : "";

  if (!topicId || !writingPlanId || !sectionId) {
    return NextResponse.json(
      { message: "topicId, writingPlanId và sectionId là bắt buộc.", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const run = await createContentProposal({
      type: parseSectionType(raw.type),
      topicId,
      writingPlanId,
      writingDraftId: typeof raw.writingDraftId === "string" ? raw.writingDraftId : null,
      sectionId,
      contextBuildId: typeof raw.contextBuildId === "string" ? raw.contextBuildId : null,
      editorInstruction: typeof raw.editorInstruction === "string" ? raw.editorInstruction.slice(0, 2000) : null,
      requestedBy: permission.user.userId ?? permission.user.username ?? null,
    });

    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      message: "Đã tạo đề xuất section. Cần Apply để ghi vào bản nháp — chưa tự động duyệt.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
