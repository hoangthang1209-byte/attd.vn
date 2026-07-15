import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { syncSupportedGraphEntities } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import { syncSystemDerivedRelationships } from "@/features/knowledge-graph/services/knowledge-graph-system-sync.service";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: {
    sourceTypes?: string[];
    dryRun?: boolean;
    batchSize?: number;
    includeSystemRelations?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const dryRun = body.dryRun !== false; // default true

  try {
    const entityReports = await syncSupportedGraphEntities({
      dryRun,
      batchSize: body.batchSize ?? 100,
      sourceTypes: body.sourceTypes,
    });

    let systemRelations = null;
    if (body.includeSystemRelations) {
      systemRelations = await syncSystemDerivedRelationships({ dryRun });
    }

    return NextResponse.json({ dryRun, entityReports, systemRelations });
  } catch (err) {
    console.error("[POST /api/admin/knowledge-graph/sync]", err);
    return NextResponse.json({ message: "Sync thất bại" }, { status: 500 });
  }
}
