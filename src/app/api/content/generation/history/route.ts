import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { listProposalHistory } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const url = new URL(req.url);
  const topicId = url.searchParams.get("topicId");
  const writingDraftId = url.searchParams.get("writingDraftId");
  const cursor = url.searchParams.get("cursor");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const result = await listProposalHistory({
      topicId,
      writingDraftId,
      cursor,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
