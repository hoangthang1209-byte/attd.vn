import { NextRequest, NextResponse } from "next/server";
import { duplicateMediaBundle } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  let includeAssets = false;
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (body && typeof body.includeAssets === "boolean") {
      includeAssets = body.includeAssets;
    }
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const bundle = await duplicateMediaBundle(id, { includeAssets });
    return NextResponse.json({ bundle }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể sao chép bộ media";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
