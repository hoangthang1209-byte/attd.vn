import { NextRequest, NextResponse } from "next/server";
import { deleteSlot, updateSlot } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; slotId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { slotId } = await context.params;
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
    const bundle = await updateSlot(slotId, {
      slotType: typeof raw.slotType === "string" ? raw.slotType : undefined,
      label: typeof raw.label === "string" ? raw.label : undefined,
      description:
        raw.description === null
          ? null
          : typeof raw.description === "string"
            ? raw.description
            : undefined,
      required: typeof raw.required === "boolean" ? raw.required : undefined,
      minAssets: typeof raw.minAssets === "number" ? raw.minAssets : undefined,
      maxAssets:
        raw.maxAssets === null
          ? null
          : typeof raw.maxAssets === "number"
            ? raw.maxAssets
            : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    return NextResponse.json({ bundle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật vị trí";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { slotId } = await context.params;
  try {
    const bundle = await deleteSlot(slotId);
    return NextResponse.json({ bundle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa vị trí";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
