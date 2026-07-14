import { NextRequest, NextResponse } from "next/server";
import { deleteSeoKeyword, updateSeoKeyword } from "@/features/content/services/seo-keyword.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseEnum, parseJsonBody, SEO_KEYWORD_TYPES, SEO_SEARCH_INTENTS } from "@/features/content/seo/seo-api-utils";

type RouteContext = { params: Promise<{ id: string; keywordId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { keywordId } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    await updateSeoKeyword(keywordId, {
      keyword: typeof raw.keyword === "string" ? raw.keyword : undefined,
      keywordType: parseEnum(raw.keywordType, SEO_KEYWORD_TYPES) ?? undefined,
      searchIntent:
        raw.searchIntent === null ? null : parseEnum(raw.searchIntent, SEO_SEARCH_INTENTS) ?? undefined,
      source: raw.source === null ? null : typeof raw.source === "string" ? raw.source : undefined,
      searchVolume: typeof raw.searchVolume === "number" ? raw.searchVolume : raw.searchVolume === null ? null : undefined,
      keywordDifficulty:
        typeof raw.keywordDifficulty === "number"
          ? raw.keywordDifficulty
          : raw.keywordDifficulty === null
            ? null
            : undefined,
      cpc: typeof raw.cpc === "number" ? raw.cpc : raw.cpc === null ? null : undefined,
      priority: typeof raw.priority === "number" ? raw.priority : undefined,
      notes: raw.notes === null ? null : typeof raw.notes === "string" ? raw.notes : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật từ khóa" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { keywordId } = await context.params;
  try {
    await deleteSeoKeyword(keywordId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể xóa từ khóa" },
      { status: 400 },
    );
  }
}
