import { NextRequest, NextResponse } from "next/server";
import { retrieveEnterpriseAiContext } from "@/features/ai-retrieval/services/ai-retrieval.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object"
      ? {
          ...(body as Record<string, unknown>),
          userId:
            permission.user.userId ??
            (permission.user as { id?: string }).id ??
            null,
        }
      : body;

  if (
    raw &&
    typeof raw === "object" &&
    (raw as { consumer?: string }).consumer === "ADMIN"
  ) {
    // ADMIN diagnostic still uses content.read for this sprint; tighten later with owner gate if needed.
  }

  const result = await retrieveEnterpriseAiContext(raw);
  if (!result.ok) {
    return NextResponse.json({ message: result.errors.join(" "), errors: result.errors }, { status: 400 });
  }

  const context = result.context;
  return NextResponse.json({
    requestId: context.requestId,
    consumer: context.consumer,
    purpose: context.purpose,
    query: context.query,
    policy: context.policy,
    facts: context.facts,
    businessRules: context.businessRules,
    conflicts: context.conflicts,
    warnings: context.warnings,
    sourcesUsed: context.sourcesUsed,
    omitted: context.omitted,
    sourceManifest: context.sourceManifest,
    contextText: context.contextText,
    contextJson: context.contextJson,
    generatedAt: context.generatedAt,
  });
}
