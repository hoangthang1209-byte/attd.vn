import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { recordProposalQualityFeedback } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Sprint 18.1 — audit-only quality review. Records a 1-5 rating + optional
 * feedback flags/note into `AiGenerationRun.warnings.qualityFeedback`.
 * Never changes proposalStatus or triggers any apply/publish action.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    const run = await recordProposalQualityFeedback(
      id,
      raw,
      permission.user.userId ?? permission.user.username ?? null,
    );
    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      message: "Đã ghi nhận đánh giá chất lượng — không thay đổi trạng thái đề xuất.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
