import { NextResponse } from "next/server";
import { defaultSimilarityProvider } from "@/features/media/intelligence/deterministic-similarity";
import { defaultBetterImageProvider } from "@/features/media/intelligence/deterministic-better-image";
import { getMediaAssetTimeline, getMediaAssetRelationships } from "@/features/media/intelligence/timeline-relationships.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "similar";

  if (view === "timeline") {
    return NextResponse.json({ mediaAssetId: id, events: await getMediaAssetTimeline(id) });
  }
  if (view === "relationships") {
    return NextResponse.json(await getMediaAssetRelationships(id));
  }
  if (view === "better") {
    const better = await defaultBetterImageProvider.findBetter({ mediaAssetId: id });
    return NextResponse.json({ mediaAssetId: id, better });
  }

  const similar = await defaultSimilarityProvider.findSimilar({
    mediaAssetId: id,
    limit: Number(url.searchParams.get("limit") ?? 12) || 12,
  });
  return NextResponse.json({ mediaAssetId: id, similar });
}
