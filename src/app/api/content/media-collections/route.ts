import { NextResponse } from "next/server";
import {
  createMediaCollection,
  listMediaCollections,
} from "@/features/media/services/media-collection.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(request.url);
  try {
    const collections = await listMediaCollections({
      activeOnly: searchParams.get("activeOnly") === "1",
      includeCounts: searchParams.get("includeCounts") === "1",
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ collections });
  } catch (err) {
    console.error("[GET /api/content/media-collections]", err);
    return NextResponse.json({ message: "Không thể tải bộ sưu tập ảnh" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "create",
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
  try {
    const collection = await createMediaCollection({
      code: typeof raw.code === "string" ? raw.code : null,
      name: typeof raw.name === "string" ? raw.name : "",
      description: typeof raw.description === "string" ? raw.description : null,
      color: typeof raw.color === "string" ? raw.color : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : Number(raw.sortOrder ?? 0),
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
    });
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo bộ sưu tập" },
      { status: 400 },
    );
  }
}
