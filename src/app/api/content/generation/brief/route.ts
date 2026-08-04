import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { createContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const topicId = typeof raw.topicId === "string" ? raw.topicId.trim() : "";
  if (!topicId) {
    return NextResponse.json({ message: "topicId là bắt buộc.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const run = await createContentProposal({
      type: "BRIEF_SUGGESTION",
      topicId,
      contextBuildId: typeof raw.contextBuildId === "string" ? raw.contextBuildId : null,
      editorInstruction: typeof raw.editorInstruction === "string" ? raw.editorInstruction.slice(0, 2000) : null,
      requestedBy: permission.user.userId ?? permission.user.username ?? null,
    });

    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      message: "Đã tạo đề xuất brief. Cần Apply có chọn lọc — chưa tự động duyệt.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
