import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getWritingGenerationSafeStatus } from "@/features/writing-engine/writing-generation-config";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  return NextResponse.json({
    providerStatus: getWritingGenerationSafeStatus(),
    backgroundStrategy:
      "synchronous_bounded_concurrency — no durable job queue; multi-section runs complete within the request.",
  });
}
