import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { resolveMediaDependencies } from "@/features/media/lifecycle/media-dependency.service";
import { MediaLifecycleError } from "@/features/media/lifecycle/lifecycle.types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      altText: true,
      url: true,
      thumbnailUrl: true,
      visibility: true,
      lifecycleStatus: true,
      lifecycleReason: true,
      deprecatedAt: true,
      archivedAt: true,
      retiredAt: true,
      replacementAssetId: true,
      supersedesAssetId: true,
      rightsStatus: true,
      rightsExpiresAt: true,
      rightsOwner: true,
      rightsNotes: true,
      usageRestriction: true,
      lastLifecycleReviewAt: true,
      nextLifecycleReviewAt: true,
      storageKey: true,
      publicId: true,
      replacementAsset: {
        select: { id: true, title: true, url: true, thumbnailUrl: true, visibility: true },
      },
      supersedesAsset: {
        select: { id: true, title: true, url: true },
      },
      supersededBy: {
        select: { id: true, title: true, url: true, createdAt: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      lifecycleEvents: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          fromStatus: true,
          toStatus: true,
          actorId: true,
          reason: true,
          replacementAssetId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json(
      { code: "ASSET_NOT_FOUND", message: "Không tìm thấy" },
      { status: 404 },
    );
  }

  return NextResponse.json({ asset });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const actorId = permission.user.userId ?? permission.user.username ?? null;

  try {
    const { transitionMediaLifecycle } = await import(
      "@/features/media/lifecycle/lifecycle-transition.service"
    );
    const toStatus = body.toStatus;
    if (
      typeof toStatus !== "string" ||
      !["ACTIVE", "REVIEW_REQUIRED", "DEPRECATED", "ARCHIVED", "RETIRED"].includes(toStatus)
    ) {
      return NextResponse.json(
        { code: "INVALID_LIFECYCLE_TRANSITION", message: "toStatus không hợp lệ" },
        { status: 400 },
      );
    }

    const result = await transitionMediaLifecycle({
      mediaAssetId: id,
      toStatus: toStatus as never,
      actorId,
      reason: typeof body.reason === "string" ? body.reason : null,
      replacementAssetId:
        typeof body.replacementAssetId === "string" ? body.replacementAssetId : null,
      allowPublicWithoutReplacement: body.allowPublicWithoutReplacement === true,
    });

    return NextResponse.json({
      ok: true,
      asset: {
        id: result.asset.id,
        lifecycleStatus: result.asset.lifecycleStatus,
        url: result.asset.url,
        storageKey: result.asset.storageKey,
        publicId: result.asset.publicId,
      },
      references: {
        total: result.references.total,
        publicCount: result.references.publicCount,
      },
    });
  } catch (err) {
    if (err instanceof MediaLifecycleError) {
      return NextResponse.json(
        { code: err.code, message: err.message, details: err.details },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Lifecycle update failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
