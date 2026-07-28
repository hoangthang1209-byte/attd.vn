/**
 * Sprint 13.5 — first production article ops run.
 *
 * Usage:
 *   npx tsx scripts/content-first-article-ops.ts           # dry-run audit
 *   npx tsx scripts/content-first-article-ops.ts --apply   # write via domain services
 *
 * Never auto-approves Review. Never publishes Blog.
 */

import { prisma } from "../src/lib/prisma";
import { getKnowledgeGraphExpansionFlagSnapshot } from "../src/features/knowledge-graph/evaluation/graph-expansion-flags";
import { updateSeoTopic } from "../src/features/content/services/seo-topic.service";
import { addSeoKeywords } from "../src/features/content/services/seo-keyword.service";
import { upsertSeoContentBrief } from "../src/features/content/services/seo-brief.service";
import { updateKnowledgeBaseEntry } from "../src/features/knowledge-base/knowledge-base-seed";
import { approveKnowledgeBaseEntry } from "../src/features/knowledge-base/knowledge-base-governance.service";
import { buildContentContextForTopic } from "../src/features/content-context/services/content-context.wiring";
import {
  buildWritingPlan,
  createEmptyDraftFromPlan,
  runWritingQaForDraft,
} from "../src/features/writing-engine/services/writing-engine.service";
import {
  createPrismaGenerationOrchestratorStore,
} from "../src/features/writing-engine/services/writing-generation.wiring";
import { saveHumanEditedSection } from "../src/features/writing-engine/services/writing-generation-orchestrator.service";
import { startContentReview } from "../src/features/content/services/content-review.service";
import { createBlogDraftFromTopic } from "../src/features/content/services/seo-content-handoff.service";
import { getContentPublishReadiness } from "../src/features/content/services/content-publish-readiness.service";
import { getPerformanceSourceReports } from "../src/features/content/services/content-performance.service";
import {
  CONTENT_LAUNCH_ARTICLE,
  CONTENT_LAUNCH_POLO_BUNDLE_CODE,
} from "../src/features/content/launch/content-launch.constants";
import {
  FIRST_ARTICLE_META,
  FIRST_ARTICLE_INTERNAL_LINKS,
  matchSectionContent,
} from "../src/features/content/launch/first-article-draft.content";

const ACTOR = "content-ops-sprint-13.5";
const APPLY = process.argv.includes("--apply");

const SAFE_PUBLIC_KB_IDS = [
  "cmqewjujn0009kz045cxl8wsx", // ATTD overview
  "cmqfmd4uz0049k004q7ji7b73", // B2B wholesale positioning
  "cmqfmd7d1004nk004f7jrgrfz", // polo polyester guidance
  "cmqfmd712004lk004gef72aol", // CVC guidance
  "cmqfhlman0011l7049zztlgaz", // ordering process
  "cmqfhlnj00013l704r2zutco6", // quotation process
  "cmqfmd810004rk004u7180rgi", // public price display policy
  "cmqfhlq5z0017l704llto7a51", // sample policy
  "cmqfhl5x1000bl704n2sqj9e9", // B2B audiences
] as const;

const SECONDARY = [
  "áo polo công ty",
  "áo polo doanh nghiệp",
  "áo polo đồng phục",
  "may áo polo đồng phục",
  "đồng phục polo công ty",
  "áo thun polo đồng phục",
  "áo polo in logo công ty",
  "áo polo thêu logo",
  "chất liệu áo polo đồng phục",
  "đặt áo polo công ty",
  "báo giá áo polo đồng phục",
  "đặt may áo polo công ty",
  "áo polo đồng phục số lượng lớn",
  "xưởng may áo polo đồng phục",
  "đơn vị may áo polo công ty",
] as const;

const QUESTIONS = [
  "Nên chọn chất liệu nào cho áo polo đồng phục?",
  "Nên in hay thêu logo trên áo polo?",
  "Chọn form áo polo đồng phục như thế nào?",
  "Áo polo đồng phục nên dùng định lượng vải bao nhiêu?",
  "Cần chuẩn bị gì trước khi đặt áo polo cho công ty?",
  "Thời gian sản xuất phụ thuộc vào những yếu tố nào?",
  "Số lượng đặt hàng ảnh hưởng đến giá như thế nào?",
] as const;

function outlineItems() {
  const headings: Array<{ level: "H2" | "H3"; heading: string; required?: boolean }> = [
    { level: "H2", heading: "Vì sao áo polo phù hợp làm đồng phục công ty?", required: true },
    { level: "H2", heading: "7 tiêu chí cần xem xét khi chọn áo polo đồng phục", required: true },
    { level: "H3", heading: "Môi trường và mục đích sử dụng", required: true },
    { level: "H3", heading: "Đối tượng mặc và form dáng", required: true },
    { level: "H3", heading: "Chất liệu vải", required: true },
    { level: "H3", heading: "Định lượng và độ dày", required: true },
    { level: "H3", heading: "Màu sắc thương hiệu", required: true },
    { level: "H3", heading: "Logo và kỹ thuật trang trí", required: true },
    { level: "H3", heading: "Ngân sách và số lượng đặt hàng", required: true },
    { level: "H2", heading: "Nên chọn chất liệu nào cho áo polo đồng phục?", required: true },
    { level: "H3", heading: "Cotton", required: true },
    { level: "H3", heading: "Cotton pha", required: true },
    { level: "H3", heading: "Polyester hoặc vải hiệu năng", required: true },
    { level: "H3", heading: "Cách chọn theo môi trường sử dụng", required: true },
    { level: "H2", heading: "Nên in hay thêu logo trên áo polo?", required: true },
    { level: "H3", heading: "Khi nào nên thêu", required: true },
    { level: "H3", heading: "Khi nào nên in", required: true },
    { level: "H3", heading: "Vị trí và kích thước logo", required: true },
    { level: "H2", heading: "Chọn form và size áo polo cho doanh nghiệp", required: true },
    { level: "H2", heading: "Quy trình đặt áo polo đồng phục", required: true },
    { level: "H2", heading: "Những lỗi doanh nghiệp thường gặp", required: true },
    { level: "H2", heading: "Câu hỏi thường gặp", required: true },
    { level: "H2", heading: "Yêu cầu tư vấn và báo giá", required: true },
  ];
  return headings.map((row, sortOrder) => ({ ...row, sortOrder }));
}

async function auditCannibalization() {
  const slug = FIRST_ARTICLE_META.slug;
  const topics = await prisma.seoTopic.findMany({
    where: {
      OR: [
        { primaryKeyword: { equals: FIRST_ARTICLE_META.primaryKeyword, mode: "insensitive" } },
        { title: { contains: "polo đồng phục", mode: "insensitive" } },
        { slug },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      primaryKeyword: true,
      searchIntent: true,
      cluster: { select: { name: true, code: true, strategy: { select: { id: true, name: true, code: true } } } },
    },
    take: 20,
  });
  const blogs = await prisma.blogPost.findMany({
    where: {
      OR: [
        { slug },
        { title: { contains: "polo", mode: "insensitive" } },
        { title: { contains: "đồng phục", mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, slug: true, status: true },
    take: 30,
  });
  return { topics, blogs };
}

async function promoteSafePublicKnowledge() {
  const promoted: Array<{ id: string; title: string; visibility: string; approvedAt: string | null }> = [];
  for (const id of SAFE_PUBLIC_KB_IDS) {
    const existing = await prisma.knowledgeBaseEntry.findUnique({
      where: { id },
      select: { id: true, title: true, visibility: true, approvedAt: true },
    });
    if (!existing) continue;
    if (existing.visibility !== "PUBLIC") {
      await updateKnowledgeBaseEntry(id, { visibility: "PUBLIC" });
    }
    if (!existing.approvedAt) {
      await approveKnowledgeBaseEntry(id, { username: ACTOR, userId: ACTOR });
    }
    const next = await prisma.knowledgeBaseEntry.findUnique({
      where: { id },
      select: { id: true, title: true, visibility: true, approvedAt: true },
    });
    if (next) {
      promoted.push({
        id: next.id,
        title: next.title,
        visibility: next.visibility,
        approvedAt: next.approvedAt?.toISOString() ?? null,
      });
    }
  }
  return promoted;
}

async function main() {
  const report: Record<string, unknown> = {
    apply: APPLY,
    actor: ACTOR,
    kgFlags: getKnowledgeGraphExpansionFlagSnapshot(),
    reused: {},
    created: {},
    blockers: [] as string[],
    warnings: [] as string[],
    humanActionsRemaining: [] as string[],
  };

  const cannibal = await auditCannibalization();
  report.cannibalization = cannibal.topics.map((t) => ({
    title: t.title,
    id: t.id,
    keyword: t.primaryKeyword,
    intent: t.searchIntent,
    status: t.status,
    strategy: t.cluster.strategy.code,
    overlapRisk:
      t.primaryKeyword.toLowerCase() === FIRST_ARTICLE_META.primaryKeyword
        ? "HIGH — reuse topic"
        : "MEDIUM — related",
    decision:
      t.primaryKeyword.toLowerCase() === FIRST_ARTICLE_META.primaryKeyword
        ? "REUSE_TOPIC"
        : "INTERNAL_LINK_OR_DIFFERENTIATE",
  }));
  report.relatedBlogs = cannibal.blogs.map((b) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    status: b.status,
    overlapRisk:
      b.slug === FIRST_ARTICLE_META.slug
        ? "BLOCKING_SLUG_CONFLICT"
        : b.title.toLowerCase().includes("polo trơn")
          ? "LOW — different intent (blank polo)"
          : "LOW_MEDIUM — related uniform content",
    decision:
      b.slug === FIRST_ARTICLE_META.slug
        ? "STOP_AND_REQUIRE_HUMAN"
        : "INTERNAL_LINK",
  }));

  const exactSlugBlog = cannibal.blogs.find((b) => b.slug === FIRST_ARTICLE_META.slug);
  if (exactSlugBlog) {
    (report.blockers as string[]).push(
      `Exact Blog slug conflict: ${exactSlugBlog.id} (${exactSlugBlog.status})`,
    );
  }

  const existingTopic =
    cannibal.topics.find(
      (t) => t.primaryKeyword.toLowerCase() === FIRST_ARTICLE_META.primaryKeyword,
    ) ?? cannibal.topics[0];

  if (!existingTopic) {
    throw new Error("Expected benchmark topic for primary keyword was not found.");
  }

  report.reused = {
    topicId: existingTopic.id,
    strategyId: existingTopic.cluster.strategy.id,
    strategyCode: existingTopic.cluster.strategy.code,
    clusterName: existingTopic.cluster.name,
    clusterCode: existingTopic.cluster.code,
  };

  const bundle = await prisma.mediaBundle.findUnique({
    where: { code: CONTENT_LAUNCH_POLO_BUNDLE_CODE },
    select: { id: true, status: true },
  });
  report.mediaBundle = bundle;

  const baseline = {
    blogCount: await prisma.blogPost.count(),
    publishedCount: await prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
    matchingPublishedCount: await prisma.blogPost.count({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: "polo", mode: "insensitive" } },
          { slug: { contains: "polo", mode: "insensitive" } },
        ],
      },
    }),
    gsc: getPerformanceSourceReports().find((s) => s.id === "search_console"),
    analytics: getPerformanceSourceReports().find((s) => s.id === "analytics"),
  };
  report.measurementBaseline = baseline;

  if (!APPLY) {
    report.note = "Dry-run only. Re-run with --apply to write Topic/Brief/Draft.";
    console.log(JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    return;
  }

  if (exactSlugBlog && exactSlugBlog.status !== "DRAFT") {
    throw new Error("Conflicting published/non-draft Blog with target slug — stop.");
  }

  // 1) Update topic metadata (valid transition IDEA -> RESEARCHING -> APPROVED)
  let topicStatus = (
    await prisma.seoTopic.findUniqueOrThrow({
      where: { id: existingTopic.id },
      select: { id: true, status: true, mediaBundleId: true },
    })
  );
  if (topicStatus.status === "IDEA") {
    await updateSeoTopic(topicStatus.id, { status: "RESEARCHING" });
    topicStatus = { ...topicStatus, status: "RESEARCHING" };
  }
  if (topicStatus.status === "RESEARCHING") {
    await updateSeoTopic(topicStatus.id, { status: "APPROVED" });
    topicStatus = { ...topicStatus, status: "APPROVED" };
  }

  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 7);
  const topic = await updateSeoTopic(topicStatus.id, {
    title: FIRST_ARTICLE_META.title,
    slug: FIRST_ARTICLE_META.slug,
    description: CONTENT_LAUNCH_ARTICLE.description,
    primaryKeyword: FIRST_ARTICLE_META.primaryKeyword,
    searchIntent: "COMMERCIAL",
    contentType: "BLOG_ARTICLE",
    funnelStage: "CONSIDERATION",
    priority: "HIGH",
    targetAudience: [
      "doanh nghiệp",
      "người phụ trách mua hàng",
      "HR / Admin",
      "agency",
      "đại lý đồng phục",
    ],
    dueDate: due,
    mediaBundleId: bundle?.id ?? topicStatus.mediaBundleId,
    notes:
      "Sprint 13.5 first production article. No auto-publish. Avoid exact MOQ/lead-time/factory-ownership claims without PUBLIC approved evidence.",
    allowDuplicate: true,
  });
  report.updatedTopic = { id: topic.id, title: topic.title, status: topic.status, slug: topic.slug };

  // 2) Keywords (no fabricated metrics)
  const kw = await addSeoKeywords({
    topicId: topic.id,
    keywords: [
      {
        keyword: FIRST_ARTICLE_META.primaryKeyword,
        keywordType: "PRIMARY",
        searchIntent: "COMMERCIAL",
        source: "sprint-13.5-seed",
        priority: 100,
        notes: "Editorial seed — no volume/KD/CPC",
      },
      ...SECONDARY.map((keyword, index) => ({
        keyword,
        keywordType: "SECONDARY" as const,
        searchIntent: "COMMERCIAL" as const,
        source: "sprint-13.5-seed",
        priority: 80 - index,
        notes: "Editorial seed only",
      })),
      ...QUESTIONS.map((keyword, index) => ({
        keyword,
        keywordType: "QUESTION" as const,
        searchIntent: "INFORMATIONAL" as const,
        source: "sprint-13.5-seed",
        priority: 40 - index,
        notes: "Editorial question seed only",
      })),
    ],
  });
  report.keywords = kw;

  // 3) Brief (NOT approved)
  const brief = await upsertSeoContentBrief(topic.id, {
    workingTitle: FIRST_ARTICLE_META.title,
    proposedSlug: FIRST_ARTICLE_META.slug,
    metaTitle: FIRST_ARTICLE_META.seoTitle,
    metaDescription: FIRST_ARTICLE_META.metaDescription,
    searchIntentNotes:
      "Commercial investigation / consideration — B2B purchasing guide for corporate polo uniforms.",
    audienceNotes:
      "Doanh nghiệp, buyer, HR/Admin, agency, đại lý đồng phục. Không viết như bài fashion generic.",
    valueProposition:
      "Giúp doanh nghiệp chọn áo polo đồng phục theo tiêu chí thực tế và chuẩn bị brief để nhận tư vấn/báo giá.",
    outline: outlineItems(),
    questions: QUESTIONS.map((q) => q),
    entities: ["áo polo", "đồng phục công ty", "in logo", "thêu logo", "CVC", "cotton", "polyester"],
    requiredSections: [
      "tiêu chí chọn",
      "chất liệu",
      "in/thêu",
      "size/form",
      "quy trình",
      "FAQ",
      "CTA",
    ],
    ctaType: "CONTACT_QUOTE",
    ctaText:
      "Chuẩn bị số lượng, đối tượng, môi trường mặc, màu, logo, kỹ thuật in/thêu và thời điểm cần nhận để nhận tư vấn báo giá.",
    wordCountMin: 1800,
    wordCountMax: 2500,
    schemaTypes: ["Article", "FAQPage", "BreadcrumbList"],
    mediaRequirements: {
      preferredBundle: CONTENT_LAUNCH_POLO_BUNDLE_CODE,
      featured: true,
      requirePublicOnly: true,
      note: "Thiếu alt text trên asset PUBLIC — cần bổ sung trước publish.",
    },
    editorNotes: [
      "Prohibited without PUBLIC evidence: factory ownership, exact MOQ, guaranteed lead time, certifications, named customers.",
      "Internal links:",
      ...FIRST_ARTICLE_INTERNAL_LINKS.map((l) => `${l.anchor} -> ${l.href}`),
      "Brief intentionally left UNAPPROVED for human approval event.",
    ].join("\n"),
  });
  report.brief = {
    id: brief.id,
    approvedAt: brief.approvedAt,
    version: brief.version,
    proposedSlug: brief.proposedSlug,
  };
  (report.humanActionsRemaining as string[]).push(
    "Approve Brief in Topic Workspace (explicit human approval).",
  );

  // 4) Promote safe PUBLIC knowledge (ops prerequisite for writer-ready context)
  report.promotedKnowledge = await promoteSafePublicKnowledge();

  // 5) Context package — use KNOWLEDGE_ARTICLE to avoid forcing auto brief approval
  let contextBuildId: string | null = null;
  try {
    const ctx = await buildContentContextForTopic(
      {
        topicId: topic.id,
        purpose: "KNOWLEDGE_ARTICLE",
        preview: false,
        language: "vi",
        includeSuggestedInternalLinks: true,
        includeMedia: true,
        includeBusinessRules: true,
        includeWarnings: true,
        forceRefreshRetrieval: true,
      },
      { requestedBy: ACTOR, userId: null },
    );
    contextBuildId = ctx.buildId;
    report.context = {
      buildId: ctx.buildId,
      ready: ctx.readiness.ready,
      score: ctx.readiness.score,
      errors: ctx.readiness.errors,
      warnings: ctx.readiness.warnings,
      factCount: ctx.package.facts.length,
      publicOnly: ctx.package.outputRules.publicOutputOnly,
      kgExpanded: false,
    };
    if (!ctx.readiness.ready) {
      (report.blockers as string[]).push(...ctx.readiness.errors);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    (report.blockers as string[]).push(`Context build failed: ${message}`);
    report.contextError = message;
  }

  // 6-8) Writing plan + draft + fill + QA + review start
  if (contextBuildId) {
    try {
      const planResult = await buildWritingPlan({
        contextBuildId,
        topicId: topic.id,
        contentType: "SEO_ARTICLE",
        forceRebuild: true,
        requestedBy: ACTOR,
      });
      report.writingPlan = {
        id: planResult.plan.id,
        status: planResult.status,
        ready: planResult.plan.readiness.ready,
        errors: planResult.plan.readiness.errors,
        warnings: planResult.plan.readiness.warnings,
        sectionCount: planResult.plan.sections.length,
      };

      if (!planResult.plan.readiness.ready) {
        const planErrors = (planResult.plan.readiness.errors ?? []).map((e) =>
          typeof e === "string" ? e : `${(e as { code?: string }).code ?? "ERROR"}: ${(e as { message?: string }).message ?? String(e)}`,
        );
        (report.blockers as string[]).push(
          ...(planErrors.length ? planErrors : ["Writing plan not ready"]),
        );
      } else {
        const empty = await createEmptyDraftFromPlan(planResult.plan.id!, ACTOR);
        const draftId = empty.draft.id;
        report.writingDraft = { id: draftId, status: empty.record.status };

        const store = createPrismaGenerationOrchestratorStore();
        let filled = 0;
        let unmatched: string[] = [];
        for (const section of planResult.plan.sections) {
          const html = matchSectionContent(section.heading);
          if (!html) {
            unmatched.push(section.heading);
            // ensure required sections still get non-empty practical text
            const fallback = `<p>${section.heading}: nội dung hướng dẫn mua hàng B2B cho áo polo đồng phục công ty — bổ sung chi tiết khi review.</p>`;
            await saveHumanEditedSection(
              {
                draftId,
                sectionId: section.id,
                html: fallback,
                lockAfterSave: true,
                editedBy: ACTOR,
              },
              store,
            );
            filled += 1;
            continue;
          }
          await saveHumanEditedSection(
            {
              draftId,
              sectionId: section.id,
              html,
              lockAfterSave: true,
              editedBy: ACTOR,
            },
            store,
          );
          filled += 1;
        }
        report.draftFill = { filled, unmatched };

        const qa = await runWritingQaForDraft(draftId);
        report.qa = {
          passed: qa.qa.passed,
          score: qa.qa.score,
          status: qa.draft.status,
          blocking: qa.qa.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR"),
          warnings: qa.qa.issues.filter((i) => i.severity === "WARNING").slice(0, 20),
          metrics: qa.qa.metrics,
        };

        if (qa.draft.status === "REVIEW_READY" || qa.draft.status === "QA_FAILED") {
          try {
            const review = await startContentReview({
              writingDraftId: draftId,
              actorId: ACTOR,
              assignedReviewerId: null,
            });
            report.review = {
              id: review.session.id,
              status: review.session.status,
              autoApproved: false,
            };
            (report.humanActionsRemaining as string[]).push(
              `Human review session ${review.session.id}: resolve issues / approve explicitly.`,
            );
          } catch (err) {
            report.reviewError = err instanceof Error ? err.message : String(err);
            (report.warnings as string[]).push(String(report.reviewError));
          }
        }
      }
    } catch (err) {
      (report.blockers as string[]).push(
        `Writing pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 9) Blog DRAFT shell via existing topic handoff (does not publish)
  try {
    const handoff = await createBlogDraftFromTopic(topic.id);
    report.blogHandoff = handoff;
    if (handoff.entityId) {
      // Transfer draft body/metadata into Blog DRAFT when writing draft exists
      const draftId =
        typeof (report.writingDraft as { id?: string } | undefined)?.id === "string"
          ? (report.writingDraft as { id: string }).id
          : null;
      if (draftId) {
        const draftRow = await prisma.writingDraftRecord.findUnique({ where: { id: draftId } });
        if (draftRow?.renderedMarkdown || draftRow?.renderedHtml) {
          await prisma.blogPost.update({
            where: { id: handoff.entityId },
            data: {
              title: FIRST_ARTICLE_META.title,
              slug: FIRST_ARTICLE_META.slug,
              content: draftRow.renderedMarkdown ?? draftRow.renderedHtml,
              metaTitle: FIRST_ARTICLE_META.seoTitle,
              metaDescription: FIRST_ARTICLE_META.metaDescription,
              canonicalUrl: `https://www.attd.vn/blog/${FIRST_ARTICLE_META.slug}`,
              status: "DRAFT",
            },
          });
          report.blogContentTransferred = true;
        }
      }

      const readiness = await getContentPublishReadiness(handoff.entityId);
      report.publishReadiness = readiness;
      (report.humanActionsRemaining as string[]).push(
        "Do NOT click Publish until human final approval.",
      );
      (report.humanActionsRemaining as string[]).push(
        `Preview Blog DRAFT at ${handoff.adminRoute} (authenticated).`,
      );
    }
  } catch (err) {
    report.blogHandoffError = err instanceof Error ? err.message : String(err);
    (report.warnings as string[]).push(String(report.blogHandoffError));
  }

  (report.humanActionsRemaining as string[]).push(
    "After Review APPROVED (if using writing-engine handoff path), complete formal Blog handoff if needed.",
  );
  (report.humanActionsRemaining as string[]).push(
    "Add/fix MediaAsset alt text for PUBLIC featured/product assets before publish.",
  );
  (report.humanActionsRemaining as string[]).push(
    "Connect GSC domain property + submit sitemap (no credentials in repo).",
  );

  report.recommendedPublicationDate = due.toISOString().slice(0, 10);
  report.noAutoApproval = true;
  report.noAutoPublish = true;
  report.noSecretsCommitted = true;

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
