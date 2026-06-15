import { NextRequest, NextResponse } from "next/server";
import { generateSeoBrief } from "@/features/seo/seo-brief-generator";
import type { SeoBriefInput, SearchIntent } from "@/features/seo/seo-brief-types";

const VALID_INTENTS: SearchIntent[] = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
  "mixed",
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const targetKeyword = typeof raw.targetKeyword === "string" ? raw.targetKeyword.trim() : "";

  if (!targetKeyword) {
    return NextResponse.json(
      { message: "Từ khóa chính là bắt buộc." },
      { status: 400 }
    );
  }

  const secondaryKeywords = Array.isArray(raw.secondaryKeywords)
    ? raw.secondaryKeywords.filter((k): k is string => typeof k === "string" && k.trim() !== "")
    : undefined;

  const searchIntent =
    typeof raw.searchIntent === "string" && VALID_INTENTS.includes(raw.searchIntent as SearchIntent)
      ? (raw.searchIntent as SearchIntent)
      : undefined;

  const audience = typeof raw.audience === "string" ? raw.audience.trim() || undefined : undefined;
  const contentGoal = typeof raw.contentGoal === "string" ? raw.contentGoal.trim() || undefined : undefined;

  const knowledgeContextRaw =
    raw.knowledgeContext && typeof raw.knowledgeContext === "object" && !Array.isArray(raw.knowledgeContext)
      ? (raw.knowledgeContext as Record<string, unknown>)
      : null;

  const knowledgeContext: SeoBriefInput["knowledgeContext"] = knowledgeContextRaw
    ? {
        selectedEntryIds: Array.isArray(knowledgeContextRaw.selectedEntryIds)
          ? (knowledgeContextRaw.selectedEntryIds as string[]).filter((id) => typeof id === "string")
          : undefined,
        contextText:
          typeof knowledgeContextRaw.contextText === "string"
            ? knowledgeContextRaw.contextText
            : undefined,
        averageReadinessScore:
          typeof knowledgeContextRaw.averageReadinessScore === "number"
            ? knowledgeContextRaw.averageReadinessScore
            : undefined,
        warnings: Array.isArray(knowledgeContextRaw.warnings)
          ? (knowledgeContextRaw.warnings as string[]).filter((w) => typeof w === "string")
          : undefined,
      }
    : undefined;

  try {
    const result = await generateSeoBrief({
      targetKeyword,
      secondaryKeywords,
      searchIntent,
      audience,
      contentGoal,
      knowledgeContext,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/admin/seo/brief]", err);
    return NextResponse.json(
      { message: "Không thể tạo SEO Brief." },
      { status: 500 }
    );
  }
}
