import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getGraphEntity } from "@/features/knowledge-graph/services/knowledge-graph-query.service";
import { listRelationshipsForEntity } from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";
import { mapRelationshipToEdgeResult } from "@/features/knowledge-graph/services/knowledge-graph-query.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const entity = await getGraphEntity(id);
    if (!entity) {
      return NextResponse.json({ message: "Không tìm thấy entity" }, { status: 404 });
    }
    const rels = await listRelationshipsForEntity(id, "both");
    return NextResponse.json({
      entity,
      outgoing: rels
        .filter((r) => r.fromEntityId === id)
        .map(mapRelationshipToEdgeResult),
      incoming: rels
        .filter((r) => r.toEntityId === id)
        .map(mapRelationshipToEdgeResult),
      relationships: rels.map((r) => ({
        ...mapRelationshipToEdgeResult(r),
        fromDisplayName: r.fromEntity.displayName,
        toDisplayName: r.toEntity.displayName,
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-graph/entities/[id]]", err);
    return NextResponse.json({ message: "Không thể tải entity" }, { status: 500 });
  }
}
