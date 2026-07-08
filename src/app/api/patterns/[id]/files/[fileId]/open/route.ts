import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2SignedAccessUrl } from "@/features/storage/r2/r2-production-file.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };
export const runtime = "nodejs";

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id, fileId } = await context.params;
  const file = await prisma.patternFile.findFirst({
    where: { id: fileId, patternId: id },
    select: { r2ObjectKey: true, originalFileName: true, previewUrl: true, type: true, mimeType: true },
  });

  if (!file) {
    return NextResponse.json({ message: "File không tồn tại hoặc bạn không có quyền truy cập." }, { status: 404 });
  }

  if (file.r2ObjectKey) {
    try {
      const inlineAllowed = file.type === "PDF" || file.type === "IMAGE";
      const url = await getR2SignedAccessUrl(file.r2ObjectKey, {
        disposition: inlineAllowed ? "inline" : "attachment",
        fileName: file.originalFileName ?? "pattern-file",
        mimeType: file.mimeType ?? "application/octet-stream",
      });
      return NextResponse.redirect(url);
    } catch (err) {
      console.error("[GET /api/patterns/[id]/files/[fileId]/open]", err);
      return NextResponse.json({ message: "Không thể mở file rập." }, { status: 503 });
    }
  }

  if (file.previewUrl && (file.type === "PDF" || file.type === "IMAGE")) {
    return NextResponse.redirect(file.previewUrl);
  }

  return NextResponse.json({ message: "Không thể mở file rập." }, { status: 404 });
}
