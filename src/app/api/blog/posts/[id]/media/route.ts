import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  assignContentMedia,
  getBlogMediaWorkspace,
  replaceContentMediaPlacement,
  setBlogMediaBundleLink,
} from "@/features/content/services/content-media-assignment.service";
import type { ContentMediaPlacement } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

const PLACEMENTS = new Set<string>([
  "FEATURED",
  "COVER",
  "OG_IMAGE",
  "INLINE",
  "HERO",
  "GALLERY",
  "BACKGROUND",
  "PROCESS",
  "MATERIAL",
  "TECHNIQUE",
  "FACTORY",
  "OTHER",
]);

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const data = await getBlogMediaWorkspace(id);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải media bài viết";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 500 },
    );
  }
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
    if ("mediaBundleId" in raw && raw.action === "set-bundle") {
      const mediaBundleId =
        raw.mediaBundleId === null
          ? null
          : typeof raw.mediaBundleId === "string"
            ? raw.mediaBundleId
            : null;
      await setBlogMediaBundleLink(id, mediaBundleId);
      const data = await getBlogMediaWorkspace(id);
      return NextResponse.json(data);
    }

    if (raw.action === "replace-placement") {
      const placement =
        typeof raw.placement === "string" && PLACEMENTS.has(raw.placement)
          ? (raw.placement as ContentMediaPlacement)
          : null;
      if (!placement) {
        return NextResponse.json({ message: "Vị trí media không hợp lệ" }, { status: 400 });
      }
      const mediaAssetIds = Array.isArray(raw.mediaAssetIds)
        ? raw.mediaAssetIds.filter((v): v is string => typeof v === "string")
        : [];
      await replaceContentMediaPlacement({
        entityType: "BLOG_POST",
        entityId: id,
        placement,
        mediaAssetIds,
      });
      const data = await getBlogMediaWorkspace(id);
      return NextResponse.json(data);
    }

    if (raw.action === "assign" || !raw.action) {
      const mediaAssetId = typeof raw.mediaAssetId === "string" ? raw.mediaAssetId : "";
      const placement =
        typeof raw.placement === "string" && PLACEMENTS.has(raw.placement)
          ? (raw.placement as ContentMediaPlacement)
          : null;
      if (!mediaAssetId || !placement) {
        return NextResponse.json(
          { message: "Thiếu mediaAssetId hoặc placement" },
          { status: 400 },
        );
      }
      const assignment = await assignContentMedia({
        entityType: "BLOG_POST",
        entityId: id,
        mediaAssetId,
        placement,
        slotKey: typeof raw.slotKey === "string" ? raw.slotKey : "",
        replaceExisting: raw.replaceExisting === true,
        altTextOverride:
          raw.altTextOverride === null
            ? null
            : typeof raw.altTextOverride === "string"
              ? raw.altTextOverride
              : undefined,
        captionOverride:
          raw.captionOverride === null
            ? null
            : typeof raw.captionOverride === "string"
              ? raw.captionOverride
              : undefined,
      });
      const data = await getBlogMediaWorkspace(id);
      return NextResponse.json({ assignment, ...data });
    }

    return NextResponse.json({ message: "Hành động không hỗ trợ" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật media";
    const status = message.includes("Không tìm thấy")
      ? 404
      : message.includes("xác nhận") || message.includes("đã được gán")
        ? 409
        : 400;
    return NextResponse.json({ message }, { status });
  }
}
