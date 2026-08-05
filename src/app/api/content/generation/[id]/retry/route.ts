import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { retryContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Sprint 18.0 — creates a brand-new proposal from a prior run's
 * type/topic/section/context (never mutates the original). Same governance
 * gates (assertGenerationAllowed, quota, claim safety) apply as any other
 * new proposal — retry is not a bypass.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  try {
    const run = await retryContentProposal(id, permission.user.userId ?? permission.user.username ?? null);
    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      message: "Đã tạo đề xuất mới từ đề xuất trước — cần Apply riêng, chưa tự động áp dụng.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
