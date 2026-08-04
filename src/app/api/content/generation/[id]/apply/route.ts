import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { applyContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};

  try {
    const { run, result } = await applyContentProposal(id, {
      appliedBy: permission.user.userId ?? permission.user.username ?? null,
      editedOutput: raw.editedOutput,
      fields: Array.isArray(raw.fields) ? raw.fields.filter((f): f is string => typeof f === "string") : undefined,
      confirmApprovedOverwrite: raw.confirmApprovedOverwrite === true,
    });

    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      result,
      message: "Đã áp dụng đề xuất. Nội dung đích chưa được duyệt/publish tự động.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
