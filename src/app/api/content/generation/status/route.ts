import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getAggregatedContentGenerationStatus } from "@/features/content-generation/services/generation-status.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  return NextResponse.json({ status: getAggregatedContentGenerationStatus() });
}
