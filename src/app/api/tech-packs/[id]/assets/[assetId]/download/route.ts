import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2SignedDownloadUrl } from "@/features/tech-pack/tech-pack-storage";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string; assetId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id, assetId } = await context.params;

  const asset = await prisma.techPackAsset.findFirst({
    where: { id: assetId, techPackId: id },
    select: { r2ObjectKey: true, originalFileName: true, previewUrl: true },
  });

  if (!asset) {
    return NextResponse.json({ message: "Không tìm thấy file." }, { status: 404 });
  }

  if (asset.r2ObjectKey) {
    const url = await getR2SignedDownloadUrl(asset.r2ObjectKey);
    if (!url) {
      return NextResponse.json({ message: "Không thể tải file. Vui lòng thử lại." }, { status: 503 });
    }
    return NextResponse.redirect(url);
  }

  if (asset.previewUrl) {
    return NextResponse.redirect(asset.previewUrl);
  }

  return NextResponse.json({ message: "File không khả dụng." }, { status: 404 });
}
