import { NextRequest, NextResponse } from "next/server";
import { buildKnowledgeContext } from "@/features/ai/ai-knowledge-context-builder";

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
    return NextResponse.json(
      { message: "Vui lòng nhập từ khóa hoặc chủ đề." },
      { status: 400 }
    );
  }

  const usageScope = Array.isArray(raw.usageScope)
    ? raw.usageScope.filter((s): s is string => typeof s === "string")
    : undefined;

  const categoryIds = Array.isArray(raw.categoryIds)
    ? raw.categoryIds.filter((id): id is string => typeof id === "string")
    : undefined;

  const selectedEntryIds = Array.isArray(raw.selectedEntryIds)
    ? raw.selectedEntryIds.filter((id): id is string => typeof id === "string")
    : undefined;

  const limit = typeof raw.limit === "number" ? raw.limit : undefined;
  const minReadinessScore =
    typeof raw.minReadinessScore === "number" ? raw.minReadinessScore : undefined;

  try {
    const result = await buildKnowledgeContext({
      query,
      usageScope,
      categoryIds,
      selectedEntryIds,
      limit,
      minReadinessScore,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/admin/ai/knowledge-context]", err);
    return NextResponse.json(
      { message: "Không thể tải ngữ cảnh Knowledge Base." },
      { status: 500 }
    );
  }
}
