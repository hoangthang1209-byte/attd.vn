import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { ContentReviewError } from "@/features/content/services/content-review.service";
import { handoffApprovedWritingDraftToBlog } from "@/features/content/services/writing-blog-handoff.service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const createPerm = await requireAdminPermission({
    platform: "content",
    action: "create",
    request: req,
  });
  const updatePerm = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });

  const { reviewId } = await context.params;
  const raw = (await parseJsonBody(req)) ?? {};
  const mode = raw.mode === "UPDATE_EXISTING" ? "UPDATE_EXISTING" : "CREATE_NEW";

  if (mode === "CREATE_NEW" && !createPerm.ok) return createPerm.response;
  if (mode === "UPDATE_EXISTING" && !updatePerm.ok) return updatePerm.response;

  const permission = mode === "CREATE_NEW" ? createPerm : updatePerm;
  if (!permission.ok) return permission.response;

  const session = await prisma.contentReviewSession.findUnique({ where: { id: reviewId } });
  if (!session) {
    return NextResponse.json({ message: "Review not found" }, { status: 404 });
  }

  try {
    const result = await handoffApprovedWritingDraftToBlog({
      writingDraftId: session.writingDraftId,
      draftVersion: session.writingDraftVersion,
      mode,
      targetBlogPostId: typeof raw.targetBlogPostId === "string" ? raw.targetBlogPostId : null,
      confirmUpdate: raw.confirmUpdate === true,
      requestedBy: permission.user.userId ?? permission.user.username ?? "unknown",
      fields: typeof raw.fields === "object" && raw.fields ? raw.fields : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    console.error("[handoff blog]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Handoff failed" },
      { status: 500 }
    );
  }
}
