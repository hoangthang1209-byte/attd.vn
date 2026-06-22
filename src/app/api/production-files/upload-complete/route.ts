import { NextRequest, NextResponse } from "next/server";
import {
  completeR2ProductionUpload,
  R2ProductionFileError,
} from "@/features/storage/r2/r2-production-file.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const sessionToken =
    typeof (body as Record<string, unknown>).sessionToken === "string"
      ? (body as Record<string, unknown>).sessionToken as string
      : "";

  if (!sessionToken) {
    return NextResponse.json({ message: "Thiếu sessionToken." }, { status: 400 });
  }

  try {
    const result = await completeR2ProductionUpload(sessionToken);
    return NextResponse.json(
      {
        asset: result.asset,
        orderId: result.orderId,
        orderItemId: result.orderItemId,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof R2ProductionFileError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/production-files/upload-complete]", err);
    return NextResponse.json({ message: "Không thể hoàn tất tải lên." }, { status: 500 });
  }
}
