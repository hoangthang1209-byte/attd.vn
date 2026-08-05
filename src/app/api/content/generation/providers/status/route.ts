import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getProviderStatusSnapshot } from "@/features/content-generation/services/proposal.wiring";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

/** Sprint 18.0 — provider health snapshot (available/keyConfigured/latency/last success-failure). No secrets. */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  try {
    const status = await getProviderStatusSnapshot();
    return NextResponse.json({ status });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
