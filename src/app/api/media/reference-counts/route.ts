import { NextResponse } from "next/server";
import { countMediaReferencesBatch } from "@/features/media/services/media-reference.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

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
  if (!Array.isArray(raw.ids) || !raw.ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ message: "Danh sách ảnh không hợp lệ" }, { status: 400 });
  }

  const ids = [...new Set(raw.ids.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  try {
    const counts = await countMediaReferencesBatch(ids);
    return NextResponse.json({ counts });
  } catch (err) {
    console.error("[POST /api/media/reference-counts]", err);
    return NextResponse.json({ message: "Không thể đếm tham chiếu ảnh" }, { status: 500 });
  }
}
