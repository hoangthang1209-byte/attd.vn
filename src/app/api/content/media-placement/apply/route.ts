import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { applyInlineMediaPlan } from "@/features/content/inline-media/inline-media-apply.service";
import type { ProposedInlinePlacement } from "@/features/content/inline-media/inline-media.types";
import { parseArticleSections } from "@/features/content/inline-media/parse-article-sections";

function parsePlacements(raw: unknown): ProposedInlinePlacement[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "placements phải là mảng không rỗng." };
  }

  const placements: ProposedInlinePlacement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return { error: "placement không hợp lệ." };
    const row = item as Record<string, unknown>;
    const block = row.block as ProposedInlinePlacement["block"] | undefined;
    const candidate = row.candidate as ProposedInlinePlacement["candidate"] | undefined;
    const section = row.section as { id?: string; heading?: string } | undefined;
    if (!block?.id || !block.mediaAssetId || !candidate?.mediaAssetId || !section?.id) {
      return { error: "Mỗi placement cần block, candidate và section." };
    }

    placements.push({
      block,
      candidate: {
        mediaAssetId: candidate.mediaAssetId,
        url: candidate.url ?? "",
        thumbnailUrl: candidate.thumbnailUrl ?? null,
        title: candidate.title ?? null,
        altText: candidate.altText ?? null,
        caption: candidate.caption ?? null,
        width: candidate.width ?? null,
        height: candidate.height ?? null,
        orientation: candidate.orientation ?? "UNKNOWN",
        seoScore: candidate.seoScore ?? 0,
        seoReadinessStatus: candidate.seoReadinessStatus ?? "BASIC",
        visibility: candidate.visibility ?? "PUBLIC",
        contentSuitabilities: candidate.contentSuitabilities ?? [],
        subjectTerms: candidate.subjectTerms ?? [],
        useCaseTerms: candidate.useCaseTerms ?? [],
        industryTerms: candidate.industryTerms ?? [],
        libraryCode: candidate.libraryCode ?? null,
        roleCode: candidate.roleCode ?? null,
        collectionIds: candidate.collectionIds ?? [],
        source: candidate.source ?? "DISCOVERY",
        bundleSlotType: candidate.bundleSlotType ?? null,
      },
      section: {
        id: section.id,
        heading: section.heading ?? "",
        level: 2,
        textLength: 0,
        headingStart: 0,
        afterHeadingIndex: 0,
        sectionEndIndex: 0,
        intent: "GENERAL",
        excluded: false,
      },
      score: (row.score as ProposedInlinePlacement["score"]) ?? { total: block.score ?? 0, signals: [] },
    });
  }
  return placements;
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const blogPostId = typeof body.blogPostId === "string" ? body.blogPostId : "";
  if (!blogPostId) {
    return NextResponse.json({ message: "Thiếu blogPostId." }, { status: 400 });
  }
  if (body.confirm !== true) {
    return NextResponse.json(
      { message: "Cần confirm: true — không áp dụng ngầm." },
      { status: 400 },
    );
  }

  const parsed = parsePlacements(body.placements);
  if ("error" in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    // Re-anchor sections against live content headings when possible.
    const { prisma } = await import("@/lib/prisma");
    const post = await prisma.blogPost.findUnique({
      where: { id: blogPostId },
      select: { content: true },
    });
    const liveSections = parseArticleSections(post?.content ?? "");
    const placements = parsed.map((placement) => {
      const live =
        liveSections.find((section) => section.id === placement.section.id) ??
        liveSections.find((section) => section.heading === placement.section.heading);
      return live ? { ...placement, section: live } : placement;
    });

    const result = await applyInlineMediaPlan({
      blogPostId,
      placements,
      rebuildUnlocked: body.rebuildUnlocked === true,
    });

    console.info("[inline-media:apply]", {
      blogPostId,
      applied: result.applied,
      skippedLocked: result.skippedLocked,
      removedUnlocked: result.removedUnlocked,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không áp dụng được kế hoạch ảnh.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
