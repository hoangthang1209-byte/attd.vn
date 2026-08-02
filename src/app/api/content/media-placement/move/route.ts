import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { prisma } from "@/lib/prisma";
import {
  INLINE_META_KEY,
  isInlineMediaAssignmentMeta,
  type InlineMediaAssignmentMeta,
  type InlineMediaPosition,
} from "@/features/content/inline-media/inline-media.types";

const POSITIONS: InlineMediaPosition[] = [
  "AFTER_HEADING",
  "AFTER_INTRO",
  "BETWEEN_PARAGRAPHS",
  "BEFORE_CTA",
];

/**
 * Move an INLINE placement's recorded position / sortOrder.
 * Content figure order is owned by the editor document; this keeps
 * ContentMediaAssignment metadata aligned.
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
  const blockId = typeof body.blockId === "string" ? body.blockId : "";
  const direction = body.direction === "up" || body.direction === "down" ? body.direction : null;
  const position =
    typeof body.position === "string" && POSITIONS.includes(body.position as InlineMediaPosition)
      ? (body.position as InlineMediaPosition)
      : null;

  if (!blogPostId || !blockId) {
    return NextResponse.json({ message: "Thiếu blogPostId hoặc blockId." }, { status: 400 });
  }

  const rows = await prisma.contentMediaAssignment.findMany({
    where: { entityType: "BLOG_POST", entityId: blogPostId, placement: "INLINE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const index = rows.findIndex((row) => {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)[INLINE_META_KEY]
        : null;
    return isInlineMediaAssignmentMeta(meta) && meta.blockId === blockId;
  });
  if (index < 0) {
    return NextResponse.json({ message: "Không tìm thấy placement." }, { status: 404 });
  }

  const current = rows[index];
  const metaRoot =
    current.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
      ? ({ ...(current.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const inline = metaRoot[INLINE_META_KEY];
  if (!isInlineMediaAssignmentMeta(inline)) {
    return NextResponse.json({ message: "Placement thiếu metadata inline." }, { status: 400 });
  }

  let nextInline: InlineMediaAssignmentMeta = { ...inline };
  if (position) nextInline = { ...nextInline, position };

  let sortOrder = current.sortOrder;
  if (direction === "up" && index > 0) {
    const neighbor = rows[index - 1];
    sortOrder = neighbor.sortOrder;
    await prisma.contentMediaAssignment.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    });
  } else if (direction === "down" && index < rows.length - 1) {
    const neighbor = rows[index + 1];
    sortOrder = neighbor.sortOrder;
    await prisma.contentMediaAssignment.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    });
  }

  await prisma.contentMediaAssignment.update({
    where: { id: current.id },
    data: {
      sortOrder,
      metadata: { ...metaRoot, [INLINE_META_KEY]: nextInline },
    },
  });

  console.info("[inline-media:move]", { blogPostId, blockId, direction, position });
  return NextResponse.json({ ok: true, blockId, sortOrder, position: nextInline.position });
}
