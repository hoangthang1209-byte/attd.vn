import { NextRequest, NextResponse } from "next/server";
import { addSeoKeywords, bulkPasteSeoKeywords } from "@/features/content/services/seo-keyword.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseEnum, parseJsonBody, SEO_KEYWORD_TYPES } from "@/features/content/seo/seo-api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    if (raw.action === "bulk-paste" && typeof raw.text === "string") {
      const result = await bulkPasteSeoKeywords({
        topicId: id,
        text: raw.text,
        keywordType: parseEnum(raw.keywordType, SEO_KEYWORD_TYPES) ?? "SECONDARY",
        source: typeof raw.source === "string" ? raw.source : "Manual",
      });
      return NextResponse.json(result);
    }

    const keywords = Array.isArray(raw.keywords) ? raw.keywords : [];
    const parsed = keywords
      .filter((k): k is Record<string, unknown> => k && typeof k === "object")
      .map((k) => ({
        keyword: typeof k.keyword === "string" ? k.keyword : "",
        keywordType: parseEnum(k.keywordType, SEO_KEYWORD_TYPES) ?? "SECONDARY",
        source: typeof k.source === "string" ? k.source : "Manual",
      }))
      .filter((k) => k.keyword.trim());

    const result = await addSeoKeywords({ topicId: id, keywords: parsed });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể thêm từ khóa" },
      { status: 400 },
    );
  }
}
