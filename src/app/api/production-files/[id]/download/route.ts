import { NextRequest, NextResponse } from "next/server";
import {
  ProductionFileAccessError,
  resolveProductionFileAccessUrl,
} from "@/features/storage/production-file-access.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const url = await resolveProductionFileAccessUrl(id, "download");
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof ProductionFileAccessError) {
      return NextResponse.json({ message: err.message }, { status: 404 });
    }
    console.error("[GET /api/production-files/[id]/download]", err);
    return NextResponse.json({ message: "Không thể tải file." }, { status: 500 });
  }
}
