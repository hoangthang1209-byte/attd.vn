import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { WRITING_CONTENT_TYPES, type WritingContentType } from "@/features/writing-engine/writing-engine.types";
import {
  buildWritingPlan,
  listWritingPlans,
  WritingEngineError,
} from "@/features/writing-engine/services/writing-engine.service";
import { toSafeWritingPlanSummary } from "@/features/writing-engine/services/writing-engine.wiring";

type RouteContext = { params: Promise<{ id: string }> };

function isWritingContentType(value: string): value is WritingContentType {
  return (WRITING_CONTENT_TYPES as readonly string[]).includes(value);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const raw = (await parseJsonBody(req)) ?? {};
  const { id: topicId } = await context.params;
  const contextBuildId = typeof raw.contextBuildId === "string" ? raw.contextBuildId : "";
  const contentTypeRaw = typeof raw.contentType === "string" ? raw.contentType : "SEO_ARTICLE";

  if (!contextBuildId) {
    return NextResponse.json({ message: "contextBuildId bắt buộc" }, { status: 400 });
  }
  if (!isWritingContentType(contentTypeRaw)) {
    return NextResponse.json({ message: "contentType không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await buildWritingPlan({
      contextBuildId,
      topicId,
      contentType: contentTypeRaw,
      forceRebuild: raw.forceRebuild === true,
      requestedBy: permission.user.userId ?? permission.user.username ?? null,
    });

    return NextResponse.json({
      plan: result.plan,
      status: result.status,
      readiness: result.plan.readiness,
      cacheHint: result.cacheHint,
      diff: result.diff,
      message: result.cacheHint
        ? "Tái sử dụng Writing Plan (cùng inputHash)."
        : "Đã tạo Writing Plan. Không gọi LLM, không tạo Blog.",
    });
  } catch (err) {
    if (err instanceof WritingEngineError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST writing-plans]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo writing plan" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const rows = await listWritingPlans(id);
  return NextResponse.json({
    plans: rows.map(toSafeWritingPlanSummary),
    mockEnabled: process.env.WRITING_ENGINE_MOCK_ENABLED === "true",
  });
}
