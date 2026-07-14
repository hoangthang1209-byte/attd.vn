import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { isContentContextPurpose } from "@/features/content-context/content-context-profiles";
import type { BuildContentContextRequest } from "@/features/content-context/content-context.types";
import {
  buildContentContextForTopic,
} from "@/features/content-context/services/content-context.wiring";
import { ContentContextBuilderError } from "@/features/content-context/services/content-context-builder.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const raw = (await parseJsonBody(req)) ?? {};
  const preview = raw.preview !== false;

  const permission = await requireAdminPermission({
    platform: "content",
    action: preview ? "read" : "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const purposeRaw = typeof raw.purpose === "string" ? raw.purpose : "SEO_ARTICLE";
  if (!isContentContextPurpose(purposeRaw)) {
    return NextResponse.json({ message: "purpose không hợp lệ" }, { status: 400 });
  }

  const request: BuildContentContextRequest = {
    topicId: id,
    purpose: purposeRaw,
    preview,
    language: typeof raw.language === "string" ? raw.language : "vi",
    maxCharacters: typeof raw.maxCharacters === "number" ? raw.maxCharacters : undefined,
    maxFacts: typeof raw.maxFacts === "number" ? raw.maxFacts : undefined,
    maxMediaAssets: typeof raw.maxMediaAssets === "number" ? raw.maxMediaAssets : undefined,
    includeSuggestedInternalLinks: raw.includeSuggestedInternalLinks !== false,
    includeMedia: raw.includeMedia !== false,
    includeBusinessRules: raw.includeBusinessRules !== false,
    includeWarnings: raw.includeWarnings !== false,
    forceRefreshRetrieval: raw.forceRefreshRetrieval === true,
  };

  try {
    const result = await buildContentContextForTopic(request, {
      requestedBy: permission.user.userId ?? permission.user.username ?? null,
      userId: permission.user.userId ?? null,
    });

    return NextResponse.json({
      buildId: result.buildId,
      cacheHit: result.cacheHit,
      readiness: result.readiness,
      package: result.package,
      sourceVersion: result.sourceVersion,
      message: result.cacheHit
        ? "Tái sử dụng Context Package đã build (cùng inputHash)."
        : "Đã xây dựng Content Context Package. Không tạo bài viết.",
    });
  } catch (err) {
    if (err instanceof ContentContextBuilderError) {
      return NextResponse.json(
        { message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[POST build-context]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể build context" },
      { status: 500 },
    );
  }
}
