import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { approveCuratedRelationship } from "@/features/knowledge-graph/services/knowledge-graph-relationship.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const actorId = permission.user.userId ?? (permission.user as { id?: string }).id ?? "admin";

  try {
    const relationship = await approveCuratedRelationship(id, actorId);
    return NextResponse.json({ relationship });
  } catch (err) {
    const message = err instanceof Error ? err.message : "approve failed";
    const status = message === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
