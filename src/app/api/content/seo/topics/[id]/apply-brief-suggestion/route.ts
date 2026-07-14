import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  applySeoBriefSuggestion,
  SeoBriefApplyError,
} from "@/features/content/services/seo-brief-apply.service";
import { createPrismaSeoBriefApplyStore } from "@/features/content/services/seo-brief-ai.wiring";
import {
  SEO_BRIEF_APPLY_FIELD_KEYS,
  type SeoBriefApplyFieldKey,
} from "@/features/content/services/seo-brief-suggestion.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const runId = typeof raw.runId === "string" ? raw.runId.trim() : "";
  if (!runId) {
    return NextResponse.json({ message: "runId là bắt buộc." }, { status: 400 });
  }

  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];
  const fields = fieldsRaw.filter(
    (f): f is SeoBriefApplyFieldKey =>
      typeof f === "string" &&
      (SEO_BRIEF_APPLY_FIELD_KEYS as readonly string[]).includes(f),
  );

  try {
    const result = await applySeoBriefSuggestion(
      {
        topicId: id,
        runId,
        fields,
        confirmApprovedOverwrite: raw.confirmApprovedOverwrite === true,
      },
      createPrismaSeoBriefApplyStore(),
    );

    return NextResponse.json({
      brief: result.brief,
      appliedFields: result.appliedFields,
      approvalCleared: result.approvalCleared,
      internalLinksNotApplied: result.internalLinksNotApplied,
      message: result.approvalCleared
        ? "Đã áp dụng suggestion và hủy duyệt brief — cần duyệt lại trước khi dùng."
        : "Đã áp dụng các field đã chọn. Brief chưa tự động được duyệt.",
    });
  } catch (err) {
    if (err instanceof SeoBriefApplyError) {
      return NextResponse.json(
        { message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[POST apply-brief-suggestion]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể áp dụng suggestion" },
      { status: 500 },
    );
  }
}
