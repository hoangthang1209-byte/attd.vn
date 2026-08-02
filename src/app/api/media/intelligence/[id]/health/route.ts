import { NextResponse } from "next/server";
import { calculateAssetHealth } from "@/features/media/intelligence/asset-health.service";
import { readIntelligentBag } from "@/features/media/intelligence/ingest-pipeline.service";
import { prisma } from "@/lib/prisma";
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
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: {
      _count: {
        select: { contentMediaAssignments: true, bundleSlotAssets: true },
      },
    },
  });
  if (!asset) {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }

  const cached = readIntelligentBag(asset.metadata)?.health;
  const health =
    cached ??
    calculateAssetHealth({
      altText: asset.altText,
      title: asset.title,
      caption: asset.caption,
      keywords: asset.keywords,
      subjectTerms: asset.subjectTerms,
      width: asset.width,
      height: asset.height,
      orientation: asset.orientation,
      visibility: asset.visibility,
      duplicateStatus: asset.duplicateStatus,
      duplicateOfId: asset.duplicateOfId,
      contentSuitabilities: asset.contentSuitabilities,
      seoScore: asset.seoScore,
      bundleCount: asset._count.bundleSlotAssets,
      usageCount: asset._count.contentMediaAssignments,
      libraryId: asset.libraryId,
      roleId: asset.roleId,
    });

  return NextResponse.json({ mediaAssetId: id, health });
}
