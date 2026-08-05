import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getProposalDetail, getProposalProviderComparison } from "@/features/content-generation/services/proposal.wiring";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Sprint 18.0 — safe proposal detail: output, timeline, rollback/retry
 * links, latency. Sprint 18.1 adds `providerComparison` (safe, read-only —
 * see proposal-detail.service.ts's buildProviderComparison); a failure to
 * compute it never fails the whole request.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  try {
    const [detail, providerComparison] = await Promise.all([
      getProposalDetail(id),
      getProposalProviderComparison(id).catch(() => null),
    ]);
    return NextResponse.json({ proposal: { ...detail, providerComparison } });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
