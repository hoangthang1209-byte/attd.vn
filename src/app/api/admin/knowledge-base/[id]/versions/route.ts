import { NextRequest, NextResponse } from "next/server";
import { listKnowledgeEntryVersions } from "@/features/knowledge-base/knowledge-base-version.service";
import { getKnowledgeBaseEntryById } from "@/features/knowledge-base/knowledge-base-seed";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const entry = await getKnowledgeBaseEntryById(id);
    if (!entry) {
      return NextResponse.json({ message: "Không tìm thấy entry" }, { status: 404 });
    }
    const versions = await listKnowledgeEntryVersions(id);
    return NextResponse.json({ entryId: id, currentVersion: entry.version, versions });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base/[id]/versions]", err);
    return NextResponse.json({ message: "Không thể tải versions" }, { status: 500 });
  }
}
