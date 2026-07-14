import { NextRequest, NextResponse } from "next/server";
import { createSlot } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
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
    const bundle = await createSlot(id, {
      slotType: typeof raw.slotType === "string" ? raw.slotType : "",
      label: typeof raw.label === "string" ? raw.label : "",
      description: typeof raw.description === "string" ? raw.description : null,
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
    return NextResponse.json({ bundle }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo vị trí";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
