import { NextRequest, NextResponse } from "next/server";
import { retrieveContextForSeoBrief } from "@/features/ai-retrieval/ai-retrieval-contracts";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, route: RouteParams) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await route.params;
  try {
    const result = await retrieveContextForSeoBrief(id, {
      userId: permission.user.userId ?? null,
      compatibilityMode: true,
    });
    return NextResponse.json({
      topicId: id,
      requestId: result.requestId,
      facts: result.facts,
      conflicts: result.conflicts,
      warnings: result.warnings,
      sourcesUsed: result.sourcesUsed,
      omitted: result.omitted,
      contextText: result.contextText,
      sourceManifest: result.sourceManifest,
      generatedAt: result.generatedAt,
      previewUrl: `/admin/content/ai-retrieval?consumer=SEO_BRIEF&purpose=CONTENT_PLANNING&seoTopicId=${encodeURIComponent(id)}`,
    });
  } catch (err) {
    console.error("[GET /api/content/seo/topics/[id]/ai-context]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo ngữ cảnh AI" },
      { status: 500 }
    );
  }
}
