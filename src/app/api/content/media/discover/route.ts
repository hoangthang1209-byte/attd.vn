import { NextResponse } from "next/server";
import {
  discoverMediaAssets,
  MEDIA_DISCOVERY_MAX_LIMIT,
} from "@/features/media/services/media-discovery.service";
import {
  validateMediaOrientation,
  validateMediaVisibility,
} from "@/features/media/media-classification";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function parseStringArray(value: unknown, field: string): string[] | { error: string } {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return { error: `${field} phải là mảng chuỗi` };
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

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
    return NextResponse.json({ message: "Request body không hợp lệ" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const libraries = parseStringArray(raw.libraries, "libraries");
  if ("error" in libraries) return NextResponse.json({ message: libraries.error }, { status: 400 });

  const roles = parseStringArray(raw.roles, "roles");
  if ("error" in roles) return NextResponse.json({ message: roles.error }, { status: 400 });

  const collections = parseStringArray(raw.collections, "collections");
  if ("error" in collections) {
    return NextResponse.json({ message: collections.error }, { status: 400 });
  }

  const keywords = parseStringArray(raw.keywords, "keywords");
  if ("error" in keywords) return NextResponse.json({ message: keywords.error }, { status: 400 });

  const tags = parseStringArray(raw.tags, "tags");
  if ("error" in tags) return NextResponse.json({ message: tags.error }, { status: 400 });

  const excludeIds = parseStringArray(raw.excludeIds, "excludeIds");
  if ("error" in excludeIds) {
    return NextResponse.json({ message: excludeIds.error }, { status: 400 });
  }

  let orientation = undefined;
  if ("orientation" in raw) {
    const parsed = validateMediaOrientation(raw.orientation);
    if (!parsed) {
      return NextResponse.json({ message: "Hướng ảnh không hợp lệ" }, { status: 400 });
    }
    orientation = parsed;
  }

  let visibility = undefined;
  if ("visibility" in raw) {
    const parsed = validateMediaVisibility(raw.visibility);
    if (!parsed) {
      return NextResponse.json({ message: "Mức độ hiển thị không hợp lệ" }, { status: 400 });
    }
    visibility = parsed;
  }

  let limit = 12;
  if ("limit" in raw) {
    const n = typeof raw.limit === "number" ? raw.limit : Number(raw.limit);
    if (!Number.isFinite(n) || n < 1 || n > MEDIA_DISCOVERY_MAX_LIMIT) {
      return NextResponse.json(
        { message: `Giới hạn kết quả phải từ 1 đến ${MEDIA_DISCOVERY_MAX_LIMIT}` },
        { status: 400 },
      );
    }
    limit = Math.floor(n);
  }

  try {
    const results = await discoverMediaAssets({
      query: typeof raw.query === "string" ? raw.query : undefined,
      libraries,
      roles,
      collections,
      keywords,
      tags,
      orientation,
      visibility,
      language: typeof raw.language === "string" ? raw.language : undefined,
      limit,
      excludeIds,
    });

    return NextResponse.json({
      items: results.map(({ asset, score, matchedOn }) => ({
        id: asset.id,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        title: asset.title,
        altText: asset.altText,
        library: asset.library
          ? { code: asset.library.code, name: asset.library.name }
          : null,
        role: asset.role ? { code: asset.role.code, name: asset.role.name } : null,
        collections: (asset.collections ?? []).slice(0, 5).map((join) => ({
          code: join.mediaCollection.code,
          name: join.mediaCollection.name,
        })),
        orientation: asset.orientation,
        visibility: asset.visibility,
        score,
        matchedOn,
      })),
    });
  } catch (err) {
    console.error("[POST /api/content/media/discover]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tìm kiếm ảnh" },
      { status: 500 },
    );
  }
}
