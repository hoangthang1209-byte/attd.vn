/**
 * OpenAI production enablement — one paid proposal for Regular/Oversize DRAFT.
 *
 * Scaffold (no paid call):
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/openai-enablement-smoke.ts
 *
 * One paid OpenAI proposal (does NOT apply, does NOT publish):
 *   node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/openai-enablement-smoke.ts --paid-once
 *
 * Never mutates BlogPost.content. Never applies the proposal. Never publishes.
 */

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { createContentProposal } from "../src/features/content-generation/services/proposal.wiring";
import { getContentGenerationConfig, getContentGenerationSafeStatus } from "../src/features/content-generation/contracts/config";
import { runEditorialQa } from "../src/features/content/editorial/editorial-qa";
import { buildDefaultBlogCanonical } from "../src/features/content/editorial/blog-canonical";
import { R1_BLOG_FORM } from "../src/features/content/revenue/r1-blog-form.content";
import { R1_MEDIA, R1_SLUGS } from "../src/features/content/revenue/r1-shared";
import {
  CONTENT_CONTEXT_BUILDER_VERSION,
  CONTENT_CONTEXT_PROFILE_VERSION,
  type ContentContextPackage,
} from "../src/features/content-context/content-context.types";
import type { WritingPlan, WritingStructuredDraft } from "../src/features/writing-engine/writing-engine.types";

const PAID_ONCE = process.argv.includes("--paid-once");
const BLOG_ID = R1_BLOG_FORM.id;
const SECTION_ID = "r1-form-body-section";
const TOPIC_SLUG = "openai-enablement-regular-oversize";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildGovernedPackage(topicId: string): ContentContextPackage {
  return {
    id: `pkg-${topicId}`,
    version: CONTENT_CONTEXT_BUILDER_VERSION,
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentPurpose: "SEO_ARTICLE",
    contentType: "ARTICLE",
    language: "vi",
    entity: {
      topicId,
      briefId: null,
      strategyId: null,
      clusterId: null,
      mediaBundleId: null,
      briefVersion: null,
    },
    topic: {
      title: R1_BLOG_FORM.title,
      primaryKeyword: "regular hay oversize áo trơn",
      searchIntent: "COMMERCIAL",
      funnelStage: "CONSIDERATION",
      targetAudience: ["xưởng in", "đại lý", "agency", "local brand"],
      supportingKeywords: ["áo thun regular", "áo thun oversize", "form áo trơn"],
      questions: [
        "Xưởng in nên nhập regular hay oversize?",
        "Khi nào nên giữ cả hai form?",
      ],
      entities: ["ATTD", "áo thun trơn"],
    },
    brief: {
      workingTitle: R1_BLOG_FORM.title,
      proposedSlug: R1_BLOG_FORM.slug,
      metaTitle: R1_BLOG_FORM.metaTitle,
      metaDescription: R1_BLOG_FORM.metaDescription,
      audienceNotes: "Xưởng in và người mua nguồn áo trơn B2B.",
      valueProposition: "Giúp chọn form theo nhu cầu khách cuối và rủi ro tồn kho.",
      outline: [
        { level: "H2", heading: "Regular: khi nào hợp lý?", purpose: "comparison", required: true, sortOrder: 1 },
        { level: "H2", heading: "Oversize: khi nào hợp lý?", purpose: "comparison", required: true, sortOrder: 2 },
        { level: "H2", heading: "Cách quyết định nhập", purpose: "checklist", required: true, sortOrder: 3 },
      ],
      requiredSections: ["INTRODUCTION", "COMPARISON", "CTA"],
      cta: { type: "CONTACT", text: "Yêu cầu báo giá" },
      wordCount: { min: 600, max: 1000 },
      schemaTypes: ["BlogPosting", "FAQPage"],
      approved: true,
      version: 1,
    },
    facts: [
      {
        factId: "fact-public-hub",
        statement: "ATTD cung cấp nguồn hàng áo thun trơn sỉ cho xưởng in, đại lý và doanh nghiệp mua B2B.",
        sourceType: "LANDING",
        sourceId: "landing-ao-thun-tron-si",
        sourceTitle: "Áo thun trơn sỉ",
        authorityRank: 80,
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        stale: false,
        required: true,
        matchedOn: ["áo thun trơn sỉ"],
        warnings: [],
        priorityScore: 80,
      },
      {
        factId: "fact-public-no-fixed-moq",
        statement: "MOQ, giá và lịch giao được xác nhận theo sản phẩm, số lượng và yêu cầu cụ thể — không niêm yết số cố định trong bài giáo dục.",
        sourceType: "POLICY",
        sourceId: "claim-safety",
        sourceTitle: "Claim Safety",
        authorityRank: 100,
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        stale: false,
        required: true,
        matchedOn: ["MOQ"],
        warnings: [],
        priorityScore: 100,
      },
    ],
    businessRules: [],
    prohibitedClaims: [
      {
        key: "unsupported_moq",
        reason: "No approved numeric MOQ evidence",
        examples: ["MOQ 50"],
        severity: "BLOCKING",
      },
      {
        key: "unsupported_price",
        reason: "No approved price evidence",
        examples: ["giá từ 79k"],
        severity: "BLOCKING",
      },
    ],
    conflicts: [],
    missingFacts: [],
    media: {
      bundle: null,
      slots: [],
      selectedAssets: [
        {
          id: R1_MEDIA.regularDetail.id,
          url: R1_MEDIA.regularDetail.url,
          altText: R1_MEDIA.regularDetail.alt,
          contentSuitabilities: ["BLOG_INLINE"],
          slotType: "INLINE",
          sortOrder: 0,
          required: false,
          selected: true,
          warnings: [],
        },
        {
          id: R1_MEDIA.khoThun.id,
          url: R1_MEDIA.khoThun.url,
          altText: R1_MEDIA.khoThun.alt,
          contentSuitabilities: ["BLOG_INLINE"],
          slotType: "INLINE",
          sortOrder: 1,
          required: false,
          selected: true,
          warnings: [],
        },
      ],
      coverage: {
        overallScore: 70,
        overallStatus: "ENOUGH",
        missingRequiredSlots: [],
      },
      warnings: [],
    },
    internalLinks: [
      {
        targetType: "URL",
        targetTitle: "Áo thun trơn sỉ",
        url: R1_SLUGS.hub,
        anchorText: "áo thun trơn sỉ",
        relevanceScore: 90,
        status: "APPROVED",
        required: true,
        recommendation: "REQUIRED",
      },
      {
        targetType: "URL",
        targetTitle: "Áo thun regular",
        url: R1_SLUGS.regular,
        anchorText: "áo thun regular",
        relevanceScore: 85,
        status: "APPROVED",
        required: false,
        recommendation: "RECOMMENDED",
      },
      {
        targetType: "URL",
        targetTitle: "Áo thun oversized",
        url: R1_SLUGS.oversize,
        anchorText: "áo thun oversized",
        relevanceScore: 85,
        status: "APPROVED",
        required: false,
        recommendation: "RECOMMENDED",
      },
      {
        targetType: "URL",
        targetTitle: "Liên hệ",
        url: R1_SLUGS.contact,
        anchorText: "Yêu cầu báo giá",
        relevanceScore: 80,
        status: "APPROVED",
        required: true,
        recommendation: "REQUIRED",
      },
      {
        targetType: "URL",
        targetTitle: "Danh mục áo thun trơn",
        url: R1_SLUGS.category,
        anchorText: "danh mục áo thun trơn",
        relevanceScore: 75,
        status: "APPROVED",
        required: false,
        recommendation: "RECOMMENDED",
      },
    ],
    brand: {
      tone: "practical_b2b_sourcing",
      voiceRules: ["natural Vietnamese", "practical trade-offs", "no blank terminology"],
      requiredPhrases: [],
      prohibitedPhrases: ["blank", "Hub:", "Catalogue:"],
      terminology: {
        blank: "áo trơn",
        regular: "regular",
        oversize: "oversize",
      },
    },
    outputRules: {
      publicOutputOnly: true,
      mustCiteFactIds: true,
      mustUseProvidedUrlsOnly: true,
      mustNotInventFacts: true,
      mustSurfaceConflicts: true,
      mustRespectMediaAssignments: true,
      maxHeadingDepth: 3,
      requiredSections: ["INTRODUCTION", "COMPARISON", "CTA"],
      prohibitedTopics: [],
    },
    sourceManifest: [
      {
        factId: "fact-public-hub",
        sourceType: "LANDING",
        sourceId: "landing-ao-thun-tron-si",
        title: "Áo thun trơn sỉ",
        visibility: "PUBLIC",
      },
    ],
    omittedSummary: [],
    warnings: [],
    budget: {
      requestedMaxCharacters: 12_000,
      actualCharacters: 2_000,
      estimatedInputTokens: 800,
      sectionsTrimmed: [],
      factsDropped: 0,
      mediaDropped: 0,
      linksDropped: 0,
    },
    diagnostics: {
      factCount: 2,
      requiredFactCount: 2,
      sourceDistribution: { LANDING: 1, POLICY: 1 },
      authorityBands: { high: 2 },
      staleCount: 0,
      legacyCompatibilityCount: 0,
      conflictCount: 0,
      blockingConflictCount: 0,
      mediaSelectedCount: 2,
      missingRequiredSlots: [],
      internalLinkCount: 5,
      actualCharacters: 2_000,
      estimatedTokens: 800,
      trimmedFacts: 0,
      trimmedAssets: 0,
      trimmedLinks: 0,
      readinessScore: 85,
    },
    contextText: "Governed OpenAI enablement context for Regular/Oversize acceptance article.",
    contextJson: {},
    retrievalRequestId: "openai-enablement-smoke",
    packageHash: "pending",
    generatedAt: new Date().toISOString(),
  };
}

function buildPlan(topicId: string, contextBuildId: string): WritingPlan {
  const now = new Date().toISOString();
  const plan = {
    id: `plan-openai-${topicId}`,
    version: "1",
    contentType: "SEO_ARTICLE",
    contextBuildId,
    topicId,
    briefId: null,
    language: "vi",
    titlePlan: { h1: R1_BLOG_FORM.title, alternatives: [], rules: [] },
    metadataPlan: {
      metaTitle: R1_BLOG_FORM.metaTitle,
      metaDescription: R1_BLOG_FORM.metaDescription,
      slug: R1_BLOG_FORM.slug,
      canonicalUrl: buildDefaultBlogCanonical(R1_BLOG_FORM.slug),
    },
    sections: [
      {
        id: SECTION_ID,
        sectionKey: "body",
        type: "COMPARISON",
        headingLevel: 2,
        heading: "Regular hay oversize cho xưởng in",
        purpose: "So sánh practical trade-offs để xưởng in quyết định nhập form",
        required: true,
        sortOrder: 0,
        targetWordCountMin: 600,
        targetWordCountMax: 1000,
        requiredFactIds: ["fact-public-hub", "fact-public-no-fixed-moq"],
        optionalFactIds: [],
        businessRuleIds: [],
        mediaAssetIds: [R1_MEDIA.regularDetail.id, R1_MEDIA.khoThun.id],
        mediaSlotTypes: ["INLINE"],
        internalLinkIds: [],
        citationIds: [],
        requiredKeywords: ["regular", "oversize", "áo trơn"],
        optionalKeywords: [],
        prohibitedClaims: ["unsupported_moq", "unsupported_price"],
        instructions: [
          "Viết tiếng Việt tự nhiên theo giọng ATTD.",
          "Không dùng blank / Hub / Catalogue.",
          "Không bịa MOQ/giá/lead time.",
        ],
        status: "READY",
        blockingIssues: [],
      },
    ],
    factPlan: { usages: [], unallocatedFactIds: [], excludedFactIds: [] },
    citationPlan: { citations: [] },
    mediaPlan: {
      placements: [],
      warnings: [],
      inlineHints: {
        requiredIntents: [],
        recommendedImageCount: 2,
        preferredSectionPlacement: [],
        excludedSectionTypes: [],
        approvedMediaSources: ["ASSIGNMENT"],
      },
    },
    internalLinkPlan: { placements: [], maxLinks: 8 },
    ctaPlan: {
      primary: {
        type: "CONTACT",
        text: "Yêu cầu báo giá",
        destination: R1_SLUGS.contact,
        sectionId: SECTION_ID,
      },
      secondary: null,
      rules: [],
      warnings: [],
    },
    keywordPlan: {
      primaryKeyword: "regular hay oversize áo trơn",
      secondaryKeywords: ["áo thun regular", "áo thun oversize"],
      sectionAssignments: [],
      prohibitedPatterns: [],
    },
    schemaPlan: { schemaTypes: ["BlogPosting", "FAQPage"], faqEnabled: true, breadcrumbEnabled: false, warnings: [] },
    outputRules: {
      publicOutputOnly: true,
      mustCiteFactIds: true,
      mustUseProvidedUrlsOnly: true,
      mustNotInventFacts: true,
      noScripts: true,
      mockAllowed: false,
    },
    qaRequirements: {
      minWordCount: 600,
      maxWordCount: 1200,
      minInternalLinks: 2,
      maxInternalLinks: 8,
      requireFeaturedMedia: true,
      requireCta: true,
    },
    readiness: { ready: true, score: 90, errors: [], warnings: [] },
    sourceManifest: [],
    warnings: [],
    planHash: createHash("sha256").update(`${topicId}:${contextBuildId}`).digest("hex"),
    generatedAt: now,
  };
  return plan as WritingPlan;
}

async function ensureScaffold(blogContent: string) {
  let strategy = await prisma.seoStrategy.findFirst({
    where: { name: "Nguồn hàng áo trơn" },
    select: { id: true },
  });
  if (!strategy) {
    strategy = await prisma.seoStrategy.create({
      data: {
        name: "Nguồn hàng áo trơn",
        description: "Revenue content strategy — áo thun trơn / sourcing B2B",
        status: "ACTIVE",
        code: "AO-TRON-SOURCING",
      },
      select: { id: true },
    });
  }

  let cluster = await prisma.seoTopicCluster.findFirst({
    where: { strategyId: strategy.id, name: "Form áo trơn" },
    select: { id: true },
  });
  if (!cluster) {
    cluster = await prisma.seoTopicCluster.create({
      data: {
        strategyId: strategy.id,
        name: "Form áo trơn",
        description: "Regular vs oversize educational cluster",
        isActive: true,
      },
      select: { id: true },
    });
  }

  let topic = await prisma.seoTopic.findFirst({
    where: { slug: TOPIC_SLUG },
    select: { id: true },
  });
  if (!topic) {
    topic = await prisma.seoTopic.create({
      data: {
        clusterId: cluster.id,
        title: R1_BLOG_FORM.title,
        slug: TOPIC_SLUG,
        description: "OpenAI enablement acceptance topic for Regular/Oversize draft.",
        primaryKeyword: "regular hay oversize áo trơn",
        searchIntent: "COMMERCIAL",
        contentType: "BLOG_ARTICLE",
        funnelStage: "CONSIDERATION",
        status: "DRAFTING",
        targetAudience: ["xưởng in", "đại lý", "agency", "local brand"],
        targetEntityType: "BLOG_POST",
        targetEntityId: BLOG_ID,
        targetUrl: `/blog/${R1_BLOG_FORM.slug}`,
        existingUrl: `/blog/${R1_BLOG_FORM.slug}`,
        canonicalUrl: buildDefaultBlogCanonical(R1_BLOG_FORM.slug),
        notes: "OPENAI_INTERNAL acceptance scaffold — proposal only, no auto-apply/publish.",
      },
      select: { id: true },
    });
  } else {
    await prisma.seoTopic.update({
      where: { id: topic.id },
      data: {
        targetEntityType: "BLOG_POST",
        targetEntityId: BLOG_ID,
        targetUrl: `/blog/${R1_BLOG_FORM.slug}`,
        status: "DRAFTING",
      },
    });
  }

  const pkg = buildGovernedPackage(topic.id);
  const packageHash = createHash("sha256").update(JSON.stringify(pkg)).digest("hex");
  const inputHash = createHash("sha256").update(`openai-enablement:${topic.id}`).digest("hex");

  let context = await prisma.contentContextBuild.findFirst({
    where: { topicId: topic.id, status: "COMPLETED", purpose: "SEO_ARTICLE" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!context) {
    context = await prisma.contentContextBuild.create({
      data: {
        topicId: topic.id,
        purpose: "SEO_ARTICLE",
        status: "COMPLETED",
        version: CONTENT_CONTEXT_BUILDER_VERSION,
        inputHash,
        packageHash,
        readinessScore: 85,
        readinessErrors: [],
        readinessWarnings: [],
        packageJson: pkg as unknown as Prisma.InputJsonValue,
        requestedBy: "openai-enablement-smoke",
        startedAt: new Date(),
        completedAt: new Date(),
      },
      select: { id: true },
    });
  }

  const planJson = buildPlan(topic.id, context.id);
  let plan = await prisma.writingPlanRecord.findFirst({
    where: { topicId: topic.id, status: "READY" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!plan) {
    plan = await prisma.writingPlanRecord.create({
      data: {
        contextBuildId: context.id,
        topicId: topic.id,
        contentType: "SEO_ARTICLE",
        status: "READY",
        version: "1",
        inputHash: planJson.planHash,
        planHash: planJson.planHash,
        planJson: { ...planJson, id: undefined } as unknown as Prisma.InputJsonValue,
        readinessScore: 90,
        readinessErrors: [],
        readinessWarnings: [],
        requestedBy: "openai-enablement-smoke",
      },
      select: { id: true },
    });
    // Persist real plan id inside planJson.sections lookups.
    const withId = { ...planJson, id: plan.id };
    await prisma.writingPlanRecord.update({
      where: { id: plan.id },
      data: { planJson: withId as unknown as Prisma.InputJsonValue },
    });
  }

  const plain = stripHtml(blogContent);
  const structured = {
    id: `draft-openai-${topic.id}`,
    planId: plan.id,
    contentType: "SEO_ARTICLE",
    language: "vi",
    title: R1_BLOG_FORM.title,
    slug: R1_BLOG_FORM.slug,
    metaTitle: R1_BLOG_FORM.metaTitle,
    metaDescription: R1_BLOG_FORM.metaDescription,
    sections: [
      {
        sectionId: SECTION_ID,
        heading: "Regular hay oversize cho xưởng in",
        html: blogContent,
        plainText: plain,
        factIdsUsed: ["fact-public-hub", "fact-public-no-fixed-moq"],
        citationIdsUsed: [],
        internalLinkIdsUsed: [],
        mediaPlacementIdsUsed: [],
        keywordUsage: [],
        claims: [],
        wordCount: plain.split(/\s+/).filter(Boolean).length,
        warnings: [],
      },
    ],
    faq: R1_BLOG_FORM.faqJson.map((f) => ({
      question: f.question,
      answerHtml: `<p>${f.answer}</p>`,
      factIdsUsed: [],
    })),
    cta: {
      primary: {
        type: "CONTACT",
        text: "Yêu cầu báo giá",
        destination: R1_SLUGS.contact,
        sectionId: SECTION_ID,
      },
      secondary: null,
      rules: [],
      warnings: [],
    },
    media: [],
    internalLinks: [],
    schemaPlan: { schemaTypes: ["BlogPosting", "FAQPage"], faqEnabled: true, breadcrumbEnabled: false, warnings: [] },
    qa: {
      passed: true,
      score: 80,
      issues: [],
      metrics: {
        totalWords: plain.split(/\s+/).filter(Boolean).length,
        sectionCount: 1,
        requiredFactCoverage: 1,
        usedFactCount: 2,
        unsupportedClaimCount: 0,
        internalLinkCount: 0,
        mediaCount: 0,
        missingAltCount: 0,
        headingErrors: 0,
        keywordWarnings: 0,
      },
    },
    rendered: { html: blogContent, markdown: null, plainText: plain },
    status: "GENERATED",
    isMock: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as WritingStructuredDraft;

  let draft = await prisma.writingDraftRecord.findFirst({
    where: { writingPlanId: plan.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, version: true },
  });
  if (!draft) {
    draft = await prisma.writingDraftRecord.create({
      data: {
        writingPlanId: plan.id,
        status: "GENERATED",
        structuredDraft: structured as unknown as Prisma.InputJsonValue,
        renderedHtml: blogContent,
        version: 1,
        createdBy: "openai-enablement-smoke",
      },
      select: { id: true, version: true },
    });
  } else {
    await prisma.writingDraftRecord.update({
      where: { id: draft.id },
      data: {
        structuredDraft: structured as unknown as Prisma.InputJsonValue,
        renderedHtml: blogContent,
        status: "GENERATED",
      },
    });
  }

  return { topicId: topic.id, contextBuildId: context.id, writingPlanId: plan.id, writingDraftId: draft.id };
}

async function main() {
  const blogBefore = await prisma.blogPost.findUniqueOrThrow({
    where: { id: BLOG_ID },
    select: {
      id: true,
      status: true,
      slug: true,
      content: true,
      updatedAt: true,
      canonicalUrl: true,
    },
  });
  if (blogBefore.status !== "DRAFT") {
    throw new Error(`Acceptance blog must remain DRAFT (found ${blogBefore.status}).`);
  }

  const otherStatuses = await prisma.blogPost.findMany({
    where: {
      id: { in: ["cmqe1hepx0000jv04uzj80tci", "cmqfmcwpf003wk0045sto7jt7", "cmsk092ym0004rwjie0as3q5g"] },
    },
    select: { id: true, slug: true, status: true, updatedAt: true },
  });

  const scaffold = await ensureScaffold(blogBefore.content ?? "");
  const config = getContentGenerationConfig();
  const safe = getContentGenerationSafeStatus(config);

  console.log(
    JSON.stringify(
      {
        phase: "scaffold",
        paidOnce: PAID_ONCE,
        blog: {
          id: blogBefore.id,
          status: blogBefore.status,
          slug: blogBefore.slug,
          canonicalUrl: blogBefore.canonicalUrl,
          contentHash: createHash("sha256").update(blogBefore.content ?? "").digest("hex"),
        },
        otherDrafts: otherStatuses,
        scaffold,
        aiStatus: {
          enabled: safe.enabled,
          provider: safe.provider,
          model: safe.model,
          rolloutStage: safe.rolloutStage,
          keyConfigured: safe.keyConfigured,
          dailyLimit: safe.dailyLimit,
          monthlyBudgetUsd: safe.monthlyBudgetUsd,
          maxSectionsPerRun: safe.maxSectionsPerRun,
        },
      },
      null,
      2,
    ),
  );

  if (!PAID_ONCE) {
    console.log("\nScaffold ready. Re-run with --paid-once after OPENAI_INTERNAL + key are live.");
    return;
  }

  if (!config.enabled || config.provider !== "OPENAI" || config.rolloutStage !== "OPENAI_INTERNAL") {
    throw new Error(
      `Refusing paid call: need enabled=true provider=OPENAI rollout=OPENAI_INTERNAL (got enabled=${config.enabled} provider=${config.provider} rollout=${config.rolloutStage}).`,
    );
  }
  if (!config.apiKeyConfigured) {
    throw new Error("OpenAI chưa được cấu hình.");
  }
  if (config.model !== "gpt-5.4-mini") {
    throw new Error(`Refusing paid call: model must be gpt-5.4-mini (got ${config.model}).`);
  }

  process.env.CONTENT_GENERATION_MAX_OUTPUT_TOKENS =
    process.env.CONTENT_GENERATION_MAX_OUTPUT_TOKENS || "2500";

  const instruction = [
    "Viết lại toàn bộ nội dung section thành bài tiếng Việt tự nhiên theo giọng ATTD editorial voice v1.",
    "Trả lời đúng câu hỏi: Regular hay oversize — xưởng in nên nhập form áo trơn nào?",
    "Giải thích trade-off thực tế: nhu cầu khách cuối, diện tích trang trí, size, màu, tồn kho/tái nhập, khi nào nên mang cả hai có chọn lọc.",
    "Không nói một form luôn tốt hơn. Không pad word count. Không dùng blank/Hub/Catalogue/campaign/brief/trend/DN.",
    "Chèn liên kết nội bộ tự nhiên từ context (chỉ URL đã cung cấp). Gợi ý media bằng mediaIdsUsed từ context, không bịa URL ảnh.",
    "Có CTA liên hệ hữu ích. Không bịa MOQ/giá/lead time.",
  ].join(" ");

  const started = Date.now();
  const run = await createContentProposal({
    type: "SECTION_REWRITE",
    topicId: scaffold.topicId,
    contextBuildId: scaffold.contextBuildId,
    writingPlanId: scaffold.writingPlanId,
    writingDraftId: scaffold.writingDraftId,
    sectionId: SECTION_ID,
    editorInstruction: instruction,
    requestedBy: "openai-enablement-smoke",
  });
  const latencyMs = Date.now() - started;

  const blogAfter = await prisma.blogPost.findUniqueOrThrow({
    where: { id: BLOG_ID },
    select: { content: true, status: true, updatedAt: true },
  });
  const contentUnchanged =
    createHash("sha256").update(blogBefore.content ?? "").digest("hex") ===
    createHash("sha256").update(blogAfter.content ?? "").digest("hex");

  const output = (run.output ?? {}) as Record<string, unknown>;
  const html = typeof output.html === "string" ? output.html : "";
  const editorial = runEditorialQa({
    title: R1_BLOG_FORM.title,
    content: html || "<p>empty</p>",
    metaTitle: R1_BLOG_FORM.metaTitle,
    metaDescription: R1_BLOG_FORM.metaDescription,
    canonicalUrl: buildDefaultBlogCanonical(R1_BLOG_FORM.slug),
    faqCount: R1_BLOG_FORM.faqJson.length,
  });

  console.log(
    JSON.stringify(
      {
        phase: "paid-once",
        generationId: run.id,
        proposalStatus: run.proposalStatus,
        runStatus: run.status,
        provider: run.provider,
        model: run.model,
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        totalTokens: run.totalTokens,
        estimatedCostUsd: run.estimatedCostUsd,
        latencyMs,
        errorMessage: run.errorMessage,
        blogStatus: blogAfter.status,
        blogContentUnchanged: contentUnchanged,
        proposalApplied: Boolean(run.appliedAt),
        editorial,
        outputPreview: html.slice(0, 500),
      },
      null,
      2,
    ),
  );

  if (run.proposalStatus === "GENERATED") {
    console.log("\nProposal GENERATED. Human must review/compare. Do NOT auto-apply. Blog remains DRAFT.");
  } else {
    console.log("\nPaid call did not produce GENERATED proposal — see errorMessage. No retry loop.");
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
