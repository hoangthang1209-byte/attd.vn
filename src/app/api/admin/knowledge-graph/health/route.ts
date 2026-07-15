import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { calculateKnowledgeGraphHealth } from "@/features/knowledge-graph/services/knowledge-graph-health.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const health = await calculateKnowledgeGraphHealth();
    return NextResponse.json({ health });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-graph/health]", err);
    return NextResponse.json({ message: "Không thể tính Knowledge Graph health" }, { status: 500 });
  }
}
