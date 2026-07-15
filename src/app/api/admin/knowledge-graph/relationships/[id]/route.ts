import { NextRequest, NextResponse } from "next/server";
import type { KnowledgeBaseVisibility } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  archiveRelationship,
  updateCuratedRelationship,
} from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const relationship = await updateCuratedRelationship(id, {
      visibility: body.visibility as KnowledgeBaseVisibility | undefined,
      confidence: typeof body.confidence === "number" ? body.confidence : undefined,
      evidenceUrl: typeof body.evidenceUrl === "string" ? body.evidenceUrl : undefined,
      validFrom: body.validFrom ? new Date(String(body.validFrom)) : undefined,
      validUntil: body.validUntil ? new Date(String(body.validUntil)) : undefined,
      sourceEntryId: typeof body.sourceEntryId === "string" ? body.sourceEntryId : undefined,
      actorId: permission.user.userId ?? (permission.user as { id?: string }).id ?? null,
    });
    return NextResponse.json({ relationship });
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    const status =
      message === "NOT_FOUND"
        ? 404
        : message === "SYSTEM_DERIVED_NOT_EDITABLE"
          ? 403
          : 400;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const relationship = await archiveRelationship(id);
    return NextResponse.json({ relationship });
  } catch (err) {
    const message = err instanceof Error ? err.message : "archive failed";
    const status =
      message === "NOT_FOUND"
        ? 404
        : message === "SYSTEM_DERIVED_ARCHIVE_REQUIRES_EXPLICIT"
          ? 403
          : 400;
    return NextResponse.json({ message }, { status });
  }
}
