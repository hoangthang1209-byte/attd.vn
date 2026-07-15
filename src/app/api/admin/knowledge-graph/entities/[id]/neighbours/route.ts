import { NextRequest, NextResponse } from "next/server";
import type { KnowledgeBaseVisibility, KnowledgeGraphRelationshipType } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getGraphNeighbours } from "@/features/knowledge-graph/services/knowledge-graph-query.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const depth = Number(searchParams.get("depth") ?? 1);
  const maxVisibility =
    (searchParams.get("maxVisibility") as KnowledgeBaseVisibility | null) ?? "CONFIDENTIAL";
  const typesParam = searchParams.get("relationshipTypes");
  const relationshipTypes = typesParam
    ? (typesParam.split(",").filter(Boolean) as KnowledgeGraphRelationshipType[])
    : undefined;

  try {
    const result = await getGraphNeighbours({
      entityId: id,
      depth,
      maxVisibility,
      relationshipTypes,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    if (message === "ENTITY_NOT_FOUND") {
      return NextResponse.json({ message: "Không tìm thấy entity" }, { status: 404 });
    }
    console.error("[GET /api/admin/knowledge-graph/entities/[id]/neighbours]", err);
    return NextResponse.json({ message: "Không thể tải neighbours" }, { status: 500 });
  }
}
