import { NextRequest, NextResponse } from "next/server";
import { rankKnowledgeEntriesForQuery } from "@/features/knowledge-base/knowledge-base-context-preview";
import { listKnowledgeBaseEntries } from "@/features/knowledge-base/knowledge-base-seed";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const query = typeof raw.query === "string" ? raw.query.trim() : "";
  if (!query) {
    return NextResponse.json({ message: "Vui lòng nhập chủ đề cần kiểm tra." }, { status: 400 });
  }

  const usageScope = Array.isArray(raw.usageScope)
    ? raw.usageScope.filter((item): item is string => typeof item === "string")
    : undefined;
  const categoryIds = Array.isArray(raw.categoryIds)
    ? raw.categoryIds.filter((item): item is string => typeof item === "string")
    : undefined;
  const limit = typeof raw.limit === "number" ? raw.limit : undefined;

  try {
    const { entries } = await listKnowledgeBaseEntries({ pageSize: 500 });
    const result = rankKnowledgeEntriesForQuery(entries as KnowledgeBaseEntryRecord[], {
      query,
      usageScope,
      categoryIds,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/admin/knowledge-base/context-preview]", err);
    return NextResponse.json({ message: "Không thể xem trước ngữ cảnh" }, { status: 500 });
  }
}
