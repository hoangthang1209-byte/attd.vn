import { NextRequest, NextResponse } from "next/server";
import { previewKnowledgeContext } from "@/features/knowledge-base/knowledge-base-context-builder";
import { listKnowledgeBaseEntries } from "@/features/knowledge-base/knowledge-base-seed";
import {
  calculateKnowledgeCompleteness,
  getCompletenessLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  try {
    const { entries } = await listKnowledgeBaseEntries({ pageSize: 200 });
    const enriched = entries.map((entry) => ({
      ...entry,
      completenessScore: calculateKnowledgeCompleteness(entry),
      completenessLabel: getCompletenessLabel(calculateKnowledgeCompleteness(entry)),
    }));

    const preview = previewKnowledgeContext(enriched, {
      keyword: typeof raw.keyword === "string" ? raw.keyword : undefined,
      blueprintId: typeof raw.blueprintId === "string" ? raw.blueprintId : undefined,
      usageScope: typeof raw.usageScope === "string" ? raw.usageScope : undefined,
      maxEntries: typeof raw.maxEntries === "number" ? raw.maxEntries : 8,
      verifiedOnly: raw.verifiedOnly === true,
      entryIds: Array.isArray(raw.entryIds)
        ? raw.entryIds.filter((id): id is string => typeof id === "string")
        : undefined,
    });

    return NextResponse.json(preview);
  } catch (err) {
    console.error("[POST /api/admin/knowledge-base/context/preview]", err);
    return NextResponse.json({ message: "Không thể tạo context preview" }, { status: 500 });
  }
}
