import { NextRequest, NextResponse } from "next/server";
import {
  deleteMediaCollection,
  getMediaCollectionById,
  updateMediaCollection,
} from "@/features/media/services/media-collection.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const collection = await getMediaCollectionById(id);
  if (!collection) {
    return NextResponse.json({ message: "Không tìm thấy bộ sưu tập" }, { status: 404 });
  }
  return NextResponse.json({ collection });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
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
    const collection = await updateMediaCollection(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      description:
        raw.description === null
          ? null
          : typeof raw.description === "string"
            ? raw.description
            : undefined,
      color:
        raw.color === null ? null : typeof raw.color === "string" ? raw.color : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ collection });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật bộ sưu tập";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    await deleteMediaCollection(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa bộ sưu tập";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
