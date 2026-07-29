import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  ContentReviewError,
  getContentReviewSession,
  getReviewDraftChanges,
} from "@/features/content/services/content-review.service";
import {
  diffPlainText,
  detectNumericChanges,
} from "@/features/content/content-review.types";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { reviewId } = await context.params;
  try {
    const result = await getContentReviewSession(reviewId);
    const { searchParams } = new URL(req.url);
    const diffSectionId = searchParams.get("diffSectionId");

    let sectionDiff = null;
    if (diffSectionId && result.structuredDraft) {
      const current = result.structuredDraft.sections.find((s) => s.sectionId === diffSectionId);
      const approved = result.session.sections.find((s) => s.sectionId === diffSectionId);
      if (current) {
        sectionDiff = {
          sectionId: diffSectionId,
          lines: diffPlainText("", current.plainText),
          numericWarnings: detectNumericChanges("", current.plainText),
          approvedContentHash: approved?.approvedContentHash ?? null,
          currentHash: null,
        };
      }
    }

    // Fact inspector from plan citations / fact plan
    const facts =
      result.writingPlan?.factPlan?.usages.map((u) => {
        const cite = result.writingPlan?.citationPlan.citations.find((c) => c.factId === u.factId);
        return {
          factId: u.factId,
          sectionId: u.sectionId,
          statement: u.statement ?? "",
          structuredValue: u.structuredValue ?? null,
          mustUseExactValue: u.mustUseExactValue,
          sourceType: cite?.sourceType ?? null,
          sourceTitle: cite?.sourceTitle ?? null,
          sourceId: cite?.sourceId ?? null,
          evidenceUrl: cite?.evidenceUrl ?? null,
          publicUseAllowed: u.publicUseAllowed,
        };
      }) ?? [];

    const draftChanges = result.readiness.stale ? await getReviewDraftChanges(reviewId) : null;

    return NextResponse.json({
      ...result,
      facts,
      sectionDiff,
      draftChanges,
      media: result.structuredDraft?.media ?? [],
      internalLinks: result.structuredDraft?.internalLinks ?? [],
      metadata: result.structuredDraft
        ? {
            title: result.structuredDraft.title,
            slug: result.structuredDraft.slug,
            metaTitle: result.structuredDraft.metaTitle,
            metaDescription: result.structuredDraft.metaDescription,
            schema: result.structuredDraft.schemaPlan,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof ContentReviewError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ message: "Không tải được review" }, { status: 500 });
  }
}
