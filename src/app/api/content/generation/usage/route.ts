import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getUsageLedgerSummary } from "@/features/content-generation/services/usage-ledger.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

/** Sprint 18.0 — admin-only usage ledger: today/month totals, top users/topics, status counts. */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  try {
    const usage = await getUsageLedgerSummary();
    return NextResponse.json({ usage });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
