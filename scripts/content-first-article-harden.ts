/**
 * Sprint 13.5.1 — First Article Production Hardening ops.
 *
 * Usage:
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/content-first-article-harden.ts
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/content-first-article-harden.ts --apply
 *
 * Never auto-approves Review/Brief. Never publishes Blog.
 */

import { prisma } from "../src/lib/prisma";
import { createSeoStrategy } from "../src/features/content/services/seo-strategy.service";
import { createSeoCluster } from "../src/features/content/services/seo-cluster.service";
import { updateSeoTopic } from "../src/features/content/services/seo-topic.service";
import {
  revokeKnowledgeBaseApproval,
} from "../src/features/knowledge-base/knowledge-base-governance.service";
import { updateKnowledgeBaseEntry } from "../src/features/knowledge-base/knowledge-base-seed";
import { updateMediaAsset } from "../src/features/media/services/media.service";
import {
  assignContentMedia,
  setBlogMediaBundleLink,
} from "../src/features/content/services/content-media-assignment.service";
import { getContentPublishReadiness } from "../src/features/content/services/content-publish-readiness.service";
import { getKnowledgeGraphExpansionFlagSnapshot } from "../src/features/knowledge-graph/evaluation/graph-expansion-flags";
import { runWritingQaForDraft } from "../src/features/writing-engine/services/writing-engine.service";
import { FIRST_ARTICLE_META } from "../src/features/content/launch/first-article-draft.content";

const APPLY = process.argv.includes("--apply");

const TOPIC_ID = "cmrmb0fqo0004rwya95a6h4ij";
const BRIEF_ID = "cms4tv0mv001brwbpxmrv5vj8";
const REVIEW_ID = "cms4tvnlo003hrwbpy3yoxu8e";
const BLOG_ID = "cms4tvq5c005drwbp5k304qzg";
const MEDIA_BUNDLE_ID = "cmrmfoose0000rwswz7kemovv";
const DRAFT_ID = "cms4tvdas001yrwbp73t8lzlo";

const FEATURED_ASSET_ID = "cmqfkgskc0007jq04kadfsmne";
const INLINE_ASSET_ID = "cmqfkgv040008jq04y8jas69t";
const INLINE_ASSET_2_ID = "cmqjnt6cm0000lh041kp225sx";

const KB_AUDIT_IDS = [
  "cmqewjujn0009kz045cxl8wsx",
  "cmqfmd4uz0049k004q7ji7b73",
  "cmqfmd7d1004nk004f7jrgrfz",
  "cmqfmd712004lk004gef72aol",
  "cmqfhlman0011l7049zztlgaz",
  "cmqfhlnj00013l704r2zutco6",
  "cmqfmd810004rk004u7180rgi",
  "cmqfhlq5z0017l704llto7a51",
  "cmqfhl5x1000bl704n2sqj9e9",
] as const;

const FAQ_JSON = [
  {
    question: "Nên chọn chất liệu nào cho áo polo đồng phục?",
    answer:
      "Phụ thuộc môi trường mặc và ưu tiên cảm giác. Cotton/cotton pha phổ biến cho văn phòng; polyester/hiệu năng phù hợp vận động nhiều. Hãy duyệt mẫu trước khi chốt.",
  },
  {
    question: "Nên in hay thêu logo?",
    answer:
      "Thêu phù hợp logo ít màu, cần độ bền và cảm giác nổi. In phù hợp logo nhiều màu hoặc chi tiết phức tạp.",
  },
  {
    question: "Làm thế nào để chọn size cho nhiều nhân viên?",
    answer:
      "Dùng size chart của mẫu đã duyệt, đo thử nhóm đại diện, rồi tổng hợp tỷ lệ size theo phòng ban.",
  },
  {
    question: "Giá áo polo đồng phục phụ thuộc vào yếu tố nào?",
    answer:
      "Chất liệu, định lượng, màu đặc biệt, kỹ thuật logo, số lượng và yêu cầu đóng gói/giao hàng. Giá cụ thể cần báo theo brief.",
  },
  {
    question: "Thời gian sản xuất được xác định như thế nào?",
    answer:
      "Thời gian sản xuất được xác nhận sau khi duyệt mẫu và chốt yêu cầu kỹ thuật — không nên lấy mốc chung khi brief còn thay đổi.",
  },
];

type Risk = "SAFE" | "NEEDS_HUMAN_CONFIRMATION" | "REVERT_REQUIRED";

function classifyKb(entry: {
  id: string;
  title: string;
  approvedBy: string | null;
  evidenceUrl: string | null;
  content: string | null;
  summary: string | null;
}): Risk {
  const text = `${entry.title}\n${entry.summary ?? ""}\n${entry.content ?? ""}`;
  const scriptApproved =
    !entry.approvedBy ||
    entry.approvedBy.includes("content-ops") ||
    entry.approvedBy.includes("sprint");
  if (scriptApproved) {
    if (
      /\b\d+\s*gsm\b/i.test(text) ||
      /\b24\s*h\b/i.test(text) ||
      /MOQ|chứng nhận|certif|nhà máy thuộc|sở hữu nhà máy|lead time|giá từ/i.test(text)
    ) {
      return "REVERT_REQUIRED";
    }
    return "REVERT_REQUIRED";
  }
  if (!entry.evidenceUrl) return "NEEDS_HUMAN_CONFIRMATION";
  return "SAFE";
}

async function ensureProductionPlacement() {
  const strategies = await prisma.seoStrategy.findMany({
    select: { id: true, name: true, code: true, status: true },
  });
  let strategy = strategies.find(
    (s) => s.name.trim().toLowerCase() === "đồng phục công ty" || s.code === "DONG_PHUC_CONG_TY",
  );

  if (!strategy && APPLY) {
    const created = await createSeoStrategy({
      name: "Đồng phục công ty",
      code: "DONG_PHUC_CONG_TY",
      description:
        "Tăng lưu lượng tìm kiếm và lead cho nhóm nhu cầu đồng phục doanh nghiệp.",
      status: "ACTIVE",
    });
    strategy = { id: created.id, name: created.name, code: created.code, status: created.status };
  }

  let cluster = strategy
    ? await prisma.seoTopicCluster.findFirst({
        where: {
          strategyId: strategy.id,
          OR: [{ name: "Áo polo đồng phục" }, { code: "AO_POLO_DONG_PHUC" }],
        },
      })
    : null;

  if (strategy && !cluster && APPLY) {
    cluster = (await createSeoCluster({
      strategyId: strategy.id,
      name: "Áo polo đồng phục",
      code: "AO_POLO_DONG_PHUC",
      description: "Cụm nội dung áo polo đồng phục doanh nghiệp.",
      pillarTopic: "Áo polo đồng phục công ty",
      targetAudience: ["HR", "Admin mua hàng", "Agency đồng phục", "Đại lý B2B"],
      businessGoals: ["Organic traffic", "Inbound leads"],
    })) as never;
    cluster = await prisma.seoTopicCluster.findFirst({
      where: { id: (cluster as { id: string }).id },
    });
  }

  const topicBefore = await prisma.seoTopic.findUnique({
    where: { id: TOPIC_ID },
    select: {
      id: true,
      clusterId: true,
      targetEntityId: true,
      targetEntityType: true,
      cluster: { select: { name: true, strategy: { select: { name: true, code: true } } } },
    },
  });

  let topicAfter = topicBefore;
  if (APPLY && cluster && topicBefore && topicBefore.clusterId !== cluster.id) {
    await updateSeoTopic(TOPIC_ID, { clusterId: cluster.id });
    topicAfter = await prisma.seoTopic.findUnique({
      where: { id: TOPIC_ID },
      select: {
        id: true,
        clusterId: true,
        targetEntityId: true,
        targetEntityType: true,
        cluster: { select: { name: true, strategy: { select: { name: true, code: true } } } },
      },
    });
  }

  // Editorial calendar is topic-derived (no separate calendar row to mutate).
  const calendarLinkValid = Boolean(topicAfter?.id && topicAfter.clusterId);

  return { strategies, strategy, cluster, topicBefore, topicAfter, calendarLinkValid };
}

async function auditAndRevertKnowledge() {
  const rows = await prisma.knowledgeBaseEntry.findMany({
    where: { id: { in: [...KB_AUDIT_IDS] } },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      visibility: true,
      status: true,
      approvedAt: true,
      approvedBy: true,
      evidenceUrl: true,
      sourceId: true,
      source: { select: { id: true, name: true, url: true } },
    },
  });

  const audited = rows.map((r) => {
    const risk = classifyKb(r);
    return {
      id: r.id,
      title: r.title,
      factText: (r.summary || r.content || "").slice(0, 400),
      source: r.source?.name || r.source?.url || r.sourceId || null,
      previousStatus: { visibility: r.visibility, approvedBy: r.approvedBy, approvedAt: r.approvedAt },
      currentStatus: { visibility: r.visibility, approvedBy: r.approvedBy, approvedAt: r.approvedAt },
      approvalTimestamp: r.approvedAt,
      approvedBy: r.approvedBy,
      evidence: r.evidenceUrl,
      useInArticle: "embedded_via_writing_plan_fact_ids",
      risk,
    };
  });

  const reverted: string[] = [];
  const retained: string[] = [];

  if (APPLY) {
    for (const item of audited) {
      if (item.risk === "REVERT_REQUIRED" || item.risk === "NEEDS_HUMAN_CONFIRMATION") {
        if (item.approvedBy) {
          await revokeKnowledgeBaseApproval(item.id);
        }
        await updateKnowledgeBaseEntry(item.id, {
          visibility: "INTERNAL",
          isVerified: false,
        });
        reverted.push(item.id);
      } else {
        retained.push(item.id);
      }
    }
  }

  const after = await prisma.knowledgeBaseEntry.findMany({
    where: { id: { in: [...KB_AUDIT_IDS] } },
    select: { id: true, visibility: true, approvedBy: true, approvedAt: true },
  });

  return {
    audited: audited.map((a) => ({
      ...a,
      currentStatus: after.find((x) => x.id === a.id) ?? a.currentStatus,
    })),
    reverted,
    retained,
  };
}

async function completeMediaAndBlog() {
  const mediaUpdates = [
    {
      id: FEATURED_ASSET_ID,
      title: "Áo polo thể thao đồng phục — hình kho sỉ",
      altText: "Áo polo thể thao đồng phục xếp chồng trong kho sỉ",
    },
    {
      id: INLINE_ASSET_ID,
      title: "Áo polo đồng phục — hình kho sỉ",
      altText: "Áo polo đồng phục cổ bẻ xếp trong kho sỉ",
    },
    {
      id: INLINE_ASSET_2_ID,
      title: "Áo polo vàng trơn",
      altText: "Áo polo vàng trơn cổ bẻ không logo",
    },
  ];

  if (APPLY) {
    for (const m of mediaUpdates) {
      await updateMediaAsset(m.id, { title: m.title, altText: m.altText });
    }

    await setBlogMediaBundleLink(BLOG_ID, MEDIA_BUNDLE_ID);

    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: FEATURED_ASSET_ID,
      placement: "FEATURED",
      replaceExisting: true,
      altTextOverride: mediaUpdates[0].altText,
    });
    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: FEATURED_ASSET_ID,
      placement: "OG_IMAGE",
      replaceExisting: true,
      altTextOverride: mediaUpdates[0].altText,
    });
    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: INLINE_ASSET_ID,
      placement: "INLINE",
      sortOrder: 0,
      altTextOverride: mediaUpdates[1].altText,
    });
    await assignContentMedia({
      entityType: "BLOG_POST",
      entityId: BLOG_ID,
      mediaAssetId: INLINE_ASSET_2_ID,
      placement: "INLINE",
      sortOrder: 1,
      altTextOverride: mediaUpdates[2].altText,
    });

    const draft = await prisma.writingDraftRecord.findUnique({
      where: { id: DRAFT_ID },
      select: { id: true, version: true, status: true, renderedMarkdown: true, renderedHtml: true },
    });

    await prisma.blogPost.update({
      where: { id: BLOG_ID },
      data: {
        faqJson: FAQ_JSON,
        sourceWritingDraftId: DRAFT_ID,
        sourceWritingDraftVersion: draft?.version ?? null,
        sourceReviewSessionId: REVIEW_ID,
        // No handoff record — pipeline-linked via Review, not full governed triad
        mediaBundleId: MEDIA_BUNDLE_ID,
        status: "DRAFT",
        title: FIRST_ARTICLE_META.title,
        slug: FIRST_ARTICLE_META.slug,
        metaTitle: FIRST_ARTICLE_META.seoTitle,
        metaDescription: FIRST_ARTICLE_META.metaDescription,
        canonicalUrl: `https://www.attd.vn/blog/${FIRST_ARTICLE_META.slug}`,
      },
    });
  }

  return { mediaUpdates, faqCount: FAQ_JSON.length };
}

async function main() {
  const kgFlags = getKnowledgeGraphExpansionFlagSnapshot();
  const placement = await ensureProductionPlacement();
  const knowledge = await auditAndRevertKnowledge();
  const media = await completeMediaAndBlog();

  let qa = null as Awaited<ReturnType<typeof runWritingQaForDraft>> | null;
  try {
    qa = await runWritingQaForDraft(DRAFT_ID);
  } catch (e) {
    console.error("QA reload note:", e instanceof Error ? e.message : e);
  }

  const readiness = await getContentPublishReadiness(BLOG_ID);
  const review = await prisma.contentReviewSession.findUnique({
    where: { id: REVIEW_ID },
    select: { id: true, status: true, approvedAt: true, approvedBy: true },
  });
  const blog = await prisma.blogPost.findUnique({
    where: { id: BLOG_ID },
    select: {
      id: true,
      status: true,
      featuredImageUrl: true,
      ogImageUrl: true,
      faqJson: true,
      sourceWritingDraftId: true,
      sourceReviewSessionId: true,
      sourceHandoffRecordId: true,
    },
  });
  const brief = await prisma.seoContentBrief.findUnique({
    where: { id: BRIEF_ID },
    select: { id: true, approvedAt: true, approvedBy: true },
  });

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        placement: {
          strategyAudit: placement.strategies,
          finalStrategy: placement.strategy,
          finalCluster: placement.cluster
            ? { id: placement.cluster.id, name: placement.cluster.name, code: placement.cluster.code }
            : null,
          topicBefore: placement.topicBefore,
          topicAfter: placement.topicAfter,
          calendarLinkValid: placement.calendarLinkValid,
        },
        knowledge,
        media,
        qa: qa
          ? {
              passed: qa.qa.passed,
              score: qa.qa.score,
              blocking: qa.qa.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR"),
              warnings: qa.qa.issues.filter((i) => i.severity === "WARNING").slice(0, 20),
            }
          : null,
        review,
        brief,
        blog,
        publishReadiness: readiness,
        kgFlags,
        noAutoApproval: true,
        noAutoPublish: true,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
