import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2SignedDownloadUrl } from "@/features/tech-pack/tech-pack-storage";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id, fileId } = await context.params;

  const file = await prisma.patternFile.findFirst({
    where: { id: fileId, patternId: id },
    select: { r2ObjectKey: true, originalFileName: true, previewUrl: true, type: true },
  });

  if (!file) {
    return NextResponse.json({ message: "Không tìm thấy file." }, { status: 404 });
  }

  if (file.r2ObjectKey) {
    const url = await getR2SignedDownloadUrl(file.r2ObjectKey);
    if (!url) {
      return NextResponse.json({ message: "Không thể tải file. Vui lòng thử lại." }, { status: 503 });
    }
    return NextResponse.redirect(url);
  }

  if (file.previewUrl && (file.type === "PDF" || file.type === "IMAGE")) {
    return NextResponse.redirect(file.previewUrl);
  }

  return NextResponse.json({ message: "File không khả dụng." }, { status: 404 });
}
