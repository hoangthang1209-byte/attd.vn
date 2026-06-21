import { NextRequest, NextResponse } from "next/server";
import type { ProductionFileStatus, ProductionFileType } from "@prisma/client";
import {
  ProductionPackValidationError,
  updateOrderProductionFile,
} from "@/features/orders/production-pack.service";
import { PRODUCTION_FILE_TYPES } from "@/features/orders/production-pack-labels";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, fileId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  try {
    const type =
      typeof raw.type === "string" && PRODUCTION_FILE_TYPES.includes(raw.type as ProductionFileType)
        ? (raw.type as ProductionFileType)
        : undefined;

    const file = await updateOrderProductionFile(id, fileId, {
      type,
      status: typeof raw.status === "string" ? (raw.status as ProductionFileStatus) : undefined,
      version: typeof raw.version === "number" ? raw.version : undefined,
      title: parseOptionalString(raw.title),
      note: parseOptionalString(raw.note),
      appliesToColorId: parseOptionalString(raw.appliesToColorId),
      appliesToColorName: parseOptionalString(raw.appliesToColorName),
      appliesToSize: parseOptionalString(raw.appliesToSize),
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      setAsActive: raw.setAsActive === true,
    });
    return NextResponse.json({ file });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/production-files/[fileId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật file sản xuất" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id, fileId } = await context.params;
  try {
    const { deleteOrderProductionFile } = await import("@/features/orders/production-pack.service");
    await deleteOrderProductionFile(id, fileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/orders/[id]/production-files/[fileId]]", err);
    return NextResponse.json({ message: "Không thể xóa file sản xuất" }, { status: 500 });
  }
}
