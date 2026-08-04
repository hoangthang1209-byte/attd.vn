import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { rejectContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  try {
    const run = await rejectContentProposal(id, permission.user.userId ?? permission.user.username ?? null);
    return NextResponse.json({ proposal: toSafeProposalDetail(run), message: "Đã từ chối đề xuất." });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
