import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { prisma } from "@/lib/prisma";

/**
 * Persist ignored suggestion media IDs on BlogPost.aiMetadata so reloads
 * keep exclusions without a new table. Client also mirrors to localStorage.
 */
export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const blogPostId = typeof body.blogPostId === "string" ? body.blogPostId : "";
  const mediaAssetId = typeof body.mediaAssetId === "string" ? body.mediaAssetId : "";
  const sectionId = typeof body.sectionId === "string" ? body.sectionId : null;
  if (!blogPostId || !mediaAssetId) {
    return NextResponse.json({ message: "Thiếu blogPostId hoặc mediaAssetId." }, { status: 400 });
  }

  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: { id: true, aiMetadata: true },
  });
  if (!post) return NextResponse.json({ message: "Không tìm thấy bài Blog." }, { status: 404 });

  const root =
    post.aiMetadata && typeof post.aiMetadata === "object" && !Array.isArray(post.aiMetadata)
      ? ({ ...(post.aiMetadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const bag =
    root.inlineMediaIgnore && typeof root.inlineMediaIgnore === "object"
      ? ({ ...(root.inlineMediaIgnore as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const list = Array.isArray(bag.mediaAssetIds)
    ? bag.mediaAssetIds.filter((item): item is string => typeof item === "string")
    : [];
  if (!list.includes(mediaAssetId)) list.push(mediaAssetId);
  bag.mediaAssetIds = list.slice(0, 200);
  if (sectionId) {
    const bySection = Array.isArray(bag.bySection)
      ? (bag.bySection as Array<Record<string, unknown>>)
      : [];
    bySection.push({ sectionId, mediaAssetId, at: new Date().toISOString() });
    bag.bySection = bySection.slice(-100);
  }
  root.inlineMediaIgnore = bag;

  await prisma.blogPost.update({
    where: { id: blogPostId },
    data: { aiMetadata: root as Prisma.InputJsonValue },
  });

  console.info("[inline-media:ignore]", { blogPostId, mediaAssetId, sectionId });
  return NextResponse.json({ ok: true, ignored: list });
}
