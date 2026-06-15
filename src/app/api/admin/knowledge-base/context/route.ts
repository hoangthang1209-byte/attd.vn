import { NextRequest, NextResponse } from "next/server";
import { previewKnowledgeContext } from "@/features/knowledge-base/knowledge-base-context-builder";
import { listKnowledgeBaseEntries } from "@/features/knowledge-base/knowledge-base-seed";
import {
  calculateKnowledgeCompleteness,
  getCompletenessLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const { entries } = await listKnowledgeBaseEntries({ pageSize: 200 });
    const enriched = entries.map((entry) => ({
      ...entry,
      completenessScore: calculateKnowledgeCompleteness(entry),
      completenessLabel: getCompletenessLabel(calculateKnowledgeCompleteness(entry)),
    }));

    const preview = previewKnowledgeContext(enriched, {
      keyword: searchParams.get("keyword") ?? undefined,
      blueprintId: searchParams.get("blueprintId") ?? undefined,
      usageScope: searchParams.get("usageScope") ?? undefined,
      maxEntries: Number(searchParams.get("maxEntries") ?? 8),
      verifiedOnly: searchParams.get("verifiedOnly") === "1",
    });

    return NextResponse.json(preview);
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base/context]", err);
    return NextResponse.json({ message: "Không thể tạo context preview" }, { status: 500 });
  }
}
