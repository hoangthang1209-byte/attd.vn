import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { ContentReviewError } from "@/features/content/services/content-review.service";
import { handoffApprovedReviewToBlog } from "@/features/content/services/writing-blog-handoff.service";
import type { HandoffFieldName } from "@/features/content/editorial/blog-handoff.policy";

type RouteContext = { params: Promise<{ reviewId: string }> };

const OVERWRITABLE_FIELDS: HandoffFieldName[] = [
  "title",
  "content",
  "metaTitle",
  "metaDescription",
  "faq",
];

export async function POST(req: NextRequest, context: RouteContext) {
  // Handoff writes an existing Blog and may create one, so both rights apply.
  const createPerm = await requireAdminPermission({
    platform: "content",
    action: "create",
    request: req,
  });
  if (!createPerm.ok) return createPerm.response;
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { reviewId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  const overwriteFields = Array.isArray(raw.overwriteFields)
    ? (raw.overwriteFields as unknown[]).filter((f): f is HandoffFieldName =>
        OVERWRITABLE_FIELDS.includes(f as HandoffFieldName),
      )
    : undefined;

  try {
    const result = await handoffApprovedReviewToBlog({
      reviewId,
      actorId: permission.user.userId ?? permission.user.username ?? "unknown",
      fields: typeof raw.fields === "object" && raw.fields ? raw.fields : undefined,
      overwriteFields,
      requireCleanSync: raw.requireCleanSync === true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code, ...(err.details ?? {}) },
        { status: err.status },
      );
    }
    // Anything the service could not shape itself: give the operator a code to
    // quote instead of a bare "Handoff failed".
    const diagnosticId = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        op: "content.handoff.blog",
        ok: false,
        stage: "route",
        reviewId,
        diagnosticId,
        errorName: err instanceof Error ? err.name : "Error",
        errorMessage: (err instanceof Error ? err.message : "unknown").slice(0, 300),
      }),
    );
    return NextResponse.json(
      {
        ok: false,
        code: "HANDOFF_WRITE_FAILED",
        message: `Bàn giao thất bại ở tầng API (mã tra cứu ${diagnosticId}). Blog không bị xuất bản và không có Blog trùng nào được tạo.`,
        diagnosticId,
      },
      { status: 500 },
    );
  }
}
