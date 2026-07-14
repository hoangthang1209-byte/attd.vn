import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  generateSeoBriefSuggestionForTopic,
  toSafeGenerationRunDetail,
} from "@/features/content/services/seo-brief-ai.wiring";
import { SeoBriefGeneratorError } from "@/features/content/services/seo-brief-generator.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  const regenerate = raw.regenerate === true;

  try {
    const result = await generateSeoBriefSuggestionForTopic({
      topicId: id,
      regenerate,
      requestedBy: permission.user.userId ?? permission.user.username ?? null,
      userId: permission.user.userId ?? null,
    });

    return NextResponse.json({
      runId: result.run.id,
      reused: result.reused,
      run: toSafeGenerationRunDetail(result.run),
      suggestion: result.suggestion,
      retrievalRequestId: result.run.retrievalRequestId,
      readinessScore: result.readinessScore,
      warnings: result.warnings,
      conflicts: result.conflicts,
      missingFacts: result.missingFacts,
      usage: {
        inputTokens: result.run.inputTokens,
        outputTokens: result.run.outputTokens,
        totalTokens: result.run.totalTokens,
        estimatedCostUsd:
          result.run.estimatedCostUsd == null
            ? null
            : Number(result.run.estimatedCostUsd),
      },
      message: result.reused
        ? "Đã tái sử dụng suggestion đã tạo (cùng inputHash)."
        : "Đã tạo suggestion. Brief chưa được lưu — cần Apply có chọn lọc.",
    });
  } catch (err) {
    if (err instanceof SeoBriefGeneratorError) {
      return NextResponse.json(
        { message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[POST generate-brief]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo SEO brief AI" },
      { status: 500 },
    );
  }
}
