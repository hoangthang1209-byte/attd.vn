import { NextRequest, NextResponse } from "next/server";
import { suggestAssetsForSlot } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; slotId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, slotId } = await context.params;

  let query: string | undefined;
  let limit: number | undefined;
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (body) {
      if (typeof body.query === "string") query = body.query;
      if (typeof body.limit === "number") limit = body.limit;
    }
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const results = await suggestAssetsForSlot(id, slotId, { query, limit });
    return NextResponse.json({
      items: results.map(({ asset, score, matchedOn }) => ({
        id: asset.id,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        title: asset.title,
        altText: asset.altText,
        library: asset.library
          ? { code: asset.library.code, name: asset.library.name }
          : null,
        role: asset.role ? { code: asset.role.code, name: asset.role.name } : null,
        collections: (asset.collections ?? []).slice(0, 5).map((join) => ({
          code: join.mediaCollection.code,
          name: join.mediaCollection.name,
          collectionType: join.mediaCollection.collectionType,
        })),
        subjectTerms: asset.subjectTerms,
        contentSuitabilities: asset.contentSuitabilities,
        assetType: asset.assetType,
        seoScore: asset.seoScore,
        seoReadinessStatus: asset.seoReadinessStatus,
        orientation: asset.orientation,
        visibility: asset.visibility,
        createdAt: asset.createdAt,
        score,
        matchedOn,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể gợi ý ảnh cho vị trí";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
