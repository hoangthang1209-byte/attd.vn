import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { rollbackContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Sprint 18.0 — restores the section html captured right before this
 * proposal was applied (see applySectionProposalAdapter's rollback
 * snapshot). Only available for already-APPLIED/EDITED_AND_APPLIED section
 * proposals that still have a snapshot in `warnings.rollbackSnapshot`.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  try {
    const { run, result } = await rollbackContentProposal(
      id,
      permission.user.userId ?? permission.user.username ?? null,
    );
    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      result,
      message: "Đã khôi phục nội dung trước khi áp dụng đề xuất này.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
