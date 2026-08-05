import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getProposalDetail } from "@/features/content-generation/services/proposal.wiring";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

/** Sprint 18.0 — safe proposal detail: output, timeline, rollback/retry links, latency. */
export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  try {
    const detail = await getProposalDetail(id);
    return NextResponse.json({ proposal: detail });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
