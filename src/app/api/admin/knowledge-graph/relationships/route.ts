import { NextRequest, NextResponse } from "next/server";
import type { KnowledgeBaseVisibility } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  batchArchiveRejectedRelationships,
  createCuratedRelationship,
  searchGraphRelationships,
} from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  try {
    const result = await searchGraphRelationships({
      search: searchParams.get("search") ?? undefined,
      relationshipType: searchParams.get("relationshipType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      origin: searchParams.get("origin") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      fromEntityType: searchParams.get("fromEntityType") ?? undefined,
      toEntityType: searchParams.get("toEntityType") ?? undefined,
      sourceEntryId: searchParams.get("sourceEntryId") ?? undefined,
      view: (searchParams.get("view") as never) ?? "all",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/knowledge-graph/relationships]", err);
    return NextResponse.json({ message: "Không thể tải relationships" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const relationship = await createCuratedRelationship({
      fromEntityId: String(body.fromEntityId ?? ""),
      toEntityId: String(body.toEntityId ?? ""),
      relationshipType: String(body.relationshipType ?? ""),
      visibility: body.visibility as KnowledgeBaseVisibility | undefined,
      confidence: typeof body.confidence === "number" ? body.confidence : null,
      evidenceUrl: typeof body.evidenceUrl === "string" ? body.evidenceUrl : null,
      validFrom: body.validFrom ? new Date(String(body.validFrom)) : null,
      validUntil: body.validUntil ? new Date(String(body.validUntil)) : null,
      sourceEntryId: typeof body.sourceEntryId === "string" ? body.sourceEntryId : null,
      createdBy: permission.user.userId ?? (permission.user as { id?: string }).id ?? null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : null,
    });
    return NextResponse.json({ relationship }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    const status =
      message.includes("not allowlisted") ||
      message.includes("cannot") ||
      message === "INVALID_RELATIONSHIP_TYPE" ||
      message === "PUBLIC_EDGE_REQUIRES_PUBLIC_ENDPOINTS" ||
      message === "EVIDENCE_REQUIRED" ||
      message === "CONFIDENCE_OUT_OF_RANGE" ||
      message === "INVALID_TEMPORAL_RANGE" ||
      message === "DUPLICATE_ACTIVE_RELATIONSHIP"
        ? 400
        : message === "ENTITY_NOT_FOUND"
          ? 404
          : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: { action?: string; ids?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "archive_rejected") {
    return NextResponse.json({ message: "Unsupported batch action" }, { status: 400 });
  }

  const archived = await batchArchiveRejectedRelationships(
    body.ids ?? [],
    permission.user.userId ?? (permission.user as { id?: string }).id ?? null
  );
  return NextResponse.json({ archived });
}
