import { NextRequest, NextResponse } from "next/server";
import type { KnowledgeBaseVisibility, KnowledgeGraphEntityStatus, KnowledgeGraphEntityType } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { findGraphEntities } from "@/features/knowledge-graph/services/knowledge-graph-query.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  try {
    const result = await findGraphEntities({
      search: searchParams.get("search") ?? undefined,
      entityType: (searchParams.get("entityType") as KnowledgeGraphEntityType | null) ?? undefined,
      status: (searchParams.get("status") as KnowledgeGraphEntityStatus | null) ?? undefined,
      visibility: (searchParams.get("visibility") as KnowledgeBaseVisibility | null) ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/knowledge-graph/entities]", err);
    return NextResponse.json({ message: "Không thể tải entities", entities: [] }, { status: 500 });
  }
}
