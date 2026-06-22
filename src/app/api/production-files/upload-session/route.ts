import { NextRequest, NextResponse } from "next/server";
import type { ProductionFileType } from "@prisma/client";
import { PRODUCTION_FILE_TYPES } from "@/features/orders/production-pack-labels";
import {
  createR2ProductionUploadSession,
  R2ProductionFileError,
} from "@/features/storage/r2/r2-production-file.service";
import { isR2Configured } from "@/features/storage/r2/r2-client";
import { ERROR_R2_NOT_CONFIGURED } from "@/features/storage/file-classification";

export const runtime = "nodejs";

function parseProductionFileType(value: unknown): ProductionFileType | null {
  if (typeof value !== "string") return null;
  return PRODUCTION_FILE_TYPES.includes(value as ProductionFileType)
    ? (value as ProductionFileType)
    : null;
}

export async function POST(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { message: ERROR_R2_NOT_CONFIGURED, r2Unavailable: true },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const orderId = typeof raw.orderId === "string" ? raw.orderId.trim() : "";
  const fileName = typeof raw.fileName === "string" ? raw.fileName.trim() : "";
  const fileSize = typeof raw.fileSize === "number" ? raw.fileSize : 0;
  const mimeType = typeof raw.mimeType === "string" ? raw.mimeType : "";
  const productionFileType = parseProductionFileType(raw.productionFileType);
  const orderItemId =
    raw.orderItemId === null || raw.orderItemId === undefined
      ? null
      : typeof raw.orderItemId === "string"
        ? raw.orderItemId.trim()
        : null;

  if (!orderId) {
    return NextResponse.json({ message: "Thiếu mã đơn hàng." }, { status: 400 });
  }
  if (!fileName) {
    return NextResponse.json({ message: "Thiếu tên file." }, { status: 400 });
  }
  if (!productionFileType) {
    return NextResponse.json({ message: "Loại file không hợp lệ." }, { status: 400 });
  }

  try {
    const session = await createR2ProductionUploadSession({
      orderId,
      orderItemId,
      fileName,
      fileSize,
      mimeType,
      productionFileType,
    });
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof R2ProductionFileError) {
      const status = err.message === ERROR_R2_NOT_CONFIGURED ? 503 : 400;
      return NextResponse.json(
        { message: err.message, r2Unavailable: status === 503 },
        { status },
      );
    }
    console.error("[POST /api/production-files/upload-session]", err);
    return NextResponse.json({ message: "Không thể tạo phiên tải lên." }, { status: 500 });
  }
}
