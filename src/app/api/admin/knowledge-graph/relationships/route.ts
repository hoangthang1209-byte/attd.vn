import { NextRequest, NextResponse } from "next/server";
import type {
  KnowledgeBaseVisibility,
  KnowledgeGraphRelationshipStatus,
  KnowledgeGraphRelationshipType,
} from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getGraphRelationships } from "@/features/knowledge-graph/services/knowledge-graph-query.service";
import { createCuratedRelationship } from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  try {
    const result = await getGraphRelationships({
      fromEntityId: searchParams.get("fromEntityId") ?? undefined,
      toEntityId: searchParams.get("toEntityId") ?? undefined,
      relationshipType:
        (searchParams.get("relationshipType") as KnowledgeGraphRelationshipType | null) ??
        undefined,
      status: (searchParams.get("status") as KnowledgeGraphRelationshipStatus | null) ?? undefined,
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
    });
    return NextResponse.json({ relationship }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    const status =
      message.includes("not allowlisted") ||
      message.includes("cannot") ||
      message === "INVALID_RELATIONSHIP_TYPE" ||
      message === "SELF_LOOP" ||
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
