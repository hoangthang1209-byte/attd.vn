import { NextRequest, NextResponse } from "next/server";
import type { ContentMediaPlacement } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getBlogMediaWorkspace,
  reorderContentMediaAssignments,
} from "@/features/content/services/content-media-assignment.service";

type RouteContext = { params: Promise<{ id: string }> };

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
  const placement = typeof raw.placement === "string" ? raw.placement : "INLINE";
  const orderedAssignmentIds = Array.isArray(raw.orderedAssignmentIds)
    ? raw.orderedAssignmentIds.filter((v): v is string => typeof v === "string")
    : [];

  if (!orderedAssignmentIds.length) {
    return NextResponse.json({ message: "Thiếu danh sách sắp xếp" }, { status: 400 });
  }

  try {
    await reorderContentMediaAssignments({
      entityType: "BLOG_POST",
      entityId: id,
      placement: placement as ContentMediaPlacement,
      orderedAssignmentIds,
    });
    const data = await getBlogMediaWorkspace(id);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể sắp xếp media";
    return NextResponse.json({ message }, { status: 400 });
  }
}
