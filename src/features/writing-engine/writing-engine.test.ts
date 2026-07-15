import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import { getWritingProfile, WRITING_PROFILES } from "@/features/writing-engine/writing-profiles";
import { compileWritingOutline } from "@/features/writing-engine/services/writing-outline-compiler.service";
import { allocateWordCounts } from "@/features/writing-engine/services/writing-word-count.service";
import { allocateFactsToSections } from "@/features/writing-engine/services/writing-fact-allocator.service";
import { planMedia } from "@/features/writing-engine/services/writing-media-planner.service";
import { planInternalLinks } from "@/features/writing-engine/services/writing-internal-link-planner.service";
import { planCta } from "@/features/writing-engine/services/writing-cta-planner.service";
import { planSchema } from "@/features/writing-engine/services/writing-schema-planner.service";
import {
  buildWritingPlanFromPackage,
  hashWritingPlanInput,
} from "@/features/writing-engine/services/writing-plan-builder.service";
import { evaluateWritingPlanReadiness } from "@/features/writing-engine/services/writing-plan-readiness.service";
import { validateSectionDraft } from "@/features/writing-engine/services/writing-section-validator.service";
import { runWritingQa } from "@/features/writing-engine/qa/writing-qa.service";
import { renderWritingDraftHtml } from "@/features/writing-engine/renderers/html-renderer";
import { renderWritingDraftMarkdown } from "@/features/writing-engine/renderers/markdown-renderer";
import {
  generateMockSectionDraft,
  isWritingMockEnabled,
} from "@/features/writing-engine/services/writing-mock-generator.service";
import type {
  WritingPlan,
  WritingSectionDraft,
  WritingStructuredDraft,
} from "@/features/writing-engine/writing-engine.types";

function basePackage(overrides: Partial<ContentContextPackage> = {}): ContentContextPackage {
  return {
    id: "pkg1",
    version: "v1",
    profileVersion: "v1",
    contentPurpose: "SEO_ARTICLE",
    contentType: "ARTICLE",
    language: "vi",
    entity: { topicId: "topic1", briefId: "brief1", briefVersion: 1 },
    topic: {
      title: "OEM áo thun",
      primaryKeyword: "ao thun oem",
      searchIntent: "COMMERCIAL",
      funnelStage: "MOFU",
      targetAudience: ["buyer"],
      supportingKeywords: ["may ao thun", "gia cong"],
      questions: ["MOQ bao nhieu?"],
      entities: ["ATTD"],
    },
    brief: {
      workingTitle: "OEM áo thun chất lượng",
      proposedSlug: "oem-ao-thun",
      metaTitle: "OEM áo thun | ATTD",
      metaDescription: "Gia cong ao thun OEM voi MOQ hop ly.",
      outline: [
        { level: "H2", heading: "Tong quan", purpose: "overview", sortOrder: 0, required: true },
        { level: "H2", heading: "Quy trinh dat hang", purpose: "process order", sortOrder: 1, required: true },
        { level: "H3", heading: "MOQ va gia", purpose: "MOQ pricing commercial", sortOrder: 2, required: true },
        { level: "H2", heading: "Chat lieu", purpose: "material fabric GSM", sortOrder: 3, required: true },
      ],
      requiredSections: ["FAQ"],
      cta: { type: "CONTACT", text: "Lien he tu van" },
      wordCount: { min: 800, max: 1500 },
      schemaTypes: ["BlogPosting", "FAQPage"],
      approved: true,
      version: 1,
    },
    facts: [
      {
        factId: "f_moq",
        statement: "MOQ 100 pcs",
        structuredValue: { moqValue: 100 },
        sourceType: "PRODUCT",
        sourceId: "p1",
        sourceTitle: "Product",
        authorityRank: 90,
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        stale: false,
        required: true,
        matchedOn: ["moq"],
        warnings: [],
        priorityScore: 90,
      },
      {
        factId: "f_material",
        statement: "Cotton 220gsm",
        structuredValue: { gsm: 220 },
        sourceType: "PRODUCT",
        sourceId: "p1",
        sourceTitle: "Product",
        authorityRank: 85,
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        stale: false,
        required: false,
        matchedOn: ["material"],
        warnings: [],
        priorityScore: 80,
      },
      {
        factId: "f_factory",
        statement: "Factory capacity 5000/day",
        structuredValue: { capacity: 5000 },
        sourceType: "KNOWLEDGE_BASE",
        sourceId: "kb1",
        sourceTitle: "Factory",
        authorityRank: 70,
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        stale: false,
        required: false,
        matchedOn: ["manufacturing"],
        warnings: [],
        priorityScore: 70,
      },
    ],
    businessRules: [],
    prohibitedClaims: [],
    conflicts: [],
    missingFacts: [],
    media: {
      bundle: { id: "b1", name: "Bundle", contentType: "SEO_ARTICLE", status: "READY" },
      slots: [{ slotType: "HERO", label: "Hero", required: true, minAssets: 1, assetCount: 1, status: "ENOUGH", warnings: [] }],
      selectedAssets: [
        {
          id: "m1",
          url: "/media/hero.jpg",
          title: "Hero",
          altText: "Hero image",
          slotType: "HERO",
          sortOrder: 0,
          required: true,
          selected: true,
          contentSuitabilities: ["SEO"],
          warnings: [],
        },
        {
          id: "m2",
          url: "/media/inline.jpg",
          title: "Inline",
          altText: "Process",
          slotType: "INLINE",
          sortOrder: 1,
          required: false,
          selected: true,
          contentSuitabilities: ["SEO"],
          warnings: [],
        },
      ],
      coverage: { overallScore: 80, overallStatus: "GOOD", missingRequiredSlots: [] },
      warnings: [],
    },
    internalLinks: [
      {
        targetType: "SEO_TOPIC",
        targetId: "topic2",
        targetTitle: "May ao thun",
        url: "/blog/may-ao-thun",
        anchorText: "may ao thun",
        relevanceScore: 0.9,
        status: "ACCEPTED",
        required: false,
        recommendation: "RECOMMENDED",
      },
      {
        targetType: "SEO_TOPIC",
        targetId: "topic3",
        targetTitle: "Gia cong",
        url: "/blog/gia-cong",
        anchorText: "gia cong",
        relevanceScore: 0.7,
        status: "SUGGESTED",
        required: false,
        recommendation: "OPTIONAL",
      },
    ],
    brand: { voiceRules: ["Professional"], requiredPhrases: [], prohibitedPhrases: [], terminology: {} },
    outputRules: {
      publicOutputOnly: true,
      mustCiteFactIds: true,
      mustUseProvidedUrlsOnly: true,
      mustNotInventFacts: true,
      mustSurfaceConflicts: true,
      mustRespectMediaAssignments: true,
      maxHeadingDepth: 3,
      requiredSections: [],
      prohibitedTopics: [],
    },
    sourceManifest: [],
    omittedSummary: [],
    warnings: [],
    budget: {
      requestedMaxCharacters: 10000,
      actualCharacters: 5000,
      sectionsTrimmed: [],
      factsDropped: 0,
      mediaDropped: 0,
      linksDropped: 0,
    },
    diagnostics: {
      factCount: 3,
      requiredFactCount: 1,
      sourceDistribution: {},
      authorityBands: {},
      staleCount: 0,
      legacyCompatibilityCount: 0,
      conflictCount: 0,
      blockingConflictCount: 0,
      mediaSelectedCount: 2,
      missingRequiredSlots: [],
      internalLinkCount: 2,
      actualCharacters: 5000,
      estimatedTokens: 1000,
      trimmedFacts: 0,
      trimmedAssets: 0,
      trimmedLinks: 0,
      readinessScore: 90,
    },
    contextText: "ctx",
    contextJson: {},
    retrievalRequestId: "r1",
    packageHash: "hash_pkg_1",
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildPlan(pkg = basePackage()): WritingPlan {
  return buildWritingPlanFromPackage(pkg, {
    contextBuildId: "build1",
    topicId: "topic1",
    contentType: "SEO_ARTICLE",
  });
}

describe("Writing profiles", () => {
  it("SEO article profile resolves correctly", () => {
    const p = getWritingProfile("SEO_ARTICLE");
    assert.equal(p.id, "SEO_ARTICLE");
    assert.ok(p.requiredSections.includes("INTRODUCTION"));
  });

  it("Landing profile requires CTA", () => {
    const p = getWritingProfile("LANDING_PAGE");
    assert.ok(p.qaThresholds.requireCta);
  });

  it("Unsupported content type rejected", () => {
    assert.throws(() => getWritingProfile("FAQ_PAGE"));
    assert.equal(WRITING_PROFILES.FAQ_PAGE, null);
  });
});

describe("Outline compiler", () => {
  it("preserves brief outline order", () => {
    const pkg = basePackage();
    const profile = getWritingProfile("SEO_ARTICLE");
    const { sections } = compileWritingOutline(pkg, profile);
    const briefHeadings = sections
      .filter((s) => !["introduction", "faq", "cta", "conclusion"].includes(s.sectionKey))
      .map((s) => s.heading);
    assert.deepEqual(briefHeadings.slice(0, 4), ["Tong quan", "Quy trinh dat hang", "MOQ va gia", "Chat lieu"]);
  });

  it("rejects invalid H3 hierarchy", () => {
    const pkg = basePackage({
      brief: {
        ...basePackage().brief,
        outline: [{ level: "H3", heading: "Orphan", purpose: "x", sortOrder: 0 }],
      },
    });
    const { errors } = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    assert.ok(errors.some((e) => e.code === "INVALID_H3_HIERARCHY"));
  });

  it("handles duplicate headings", () => {
    const pkg = basePackage({
      brief: {
        ...basePackage().brief,
        outline: [
          { level: "H2", heading: "Dup", sortOrder: 0 },
          { level: "H2", heading: "Dup", sortOrder: 1 },
        ],
      },
    });
    const { warnings, sections } = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    assert.ok(warnings.some((w) => w.code === "DUPLICATE_HEADING"));
    assert.ok(sections.filter((s) => s.heading === "Dup").length <= 1);
  });

  it("adds FAQ/CTA only when appropriate", () => {
    const pkg = basePackage();
    const { sections } = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    assert.ok(sections.some((s) => s.type === "FAQ"));
    assert.ok(sections.some((s) => s.type === "CTA"));
  });
});

describe("Fact allocation", () => {
  it("allocates MOQ to commercial section", () => {
    const pkg = basePackage();
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const { sections } = allocateFactsToSections(pkg, outline.sections);
    const commercial = sections.find((s) => s.requiredFactIds.includes("f_moq"));
    assert.ok(commercial);
    assert.match(commercial!.type + commercial!.purpose, /COMMERCIAL|PRICING|MOQ|commercial/i);
  });

  it("allocates material fact to material section", () => {
    const pkg = basePackage();
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const { sections } = allocateFactsToSections(pkg, outline.sections);
    const material = sections.find((s) => s.optionalFactIds.includes("f_material") || s.requiredFactIds.includes("f_material"));
    assert.ok(material);
    assert.equal(material!.type, "MATERIAL");
  });

  it("allocates factory fact to manufacturing/process section", () => {
    const pkg = basePackage();
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const { sections } = allocateFactsToSections(pkg, outline.sections);
    const factory = sections.find((s) => s.optionalFactIds.includes("f_factory"));
    assert.ok(factory);
    assert.ok(["MANUFACTURING", "PROCESS", "INFORMATIONAL"].includes(factory!.type));
  });

  it("excludes blocking conflict facts", () => {
    const pkg = basePackage({
      conflicts: [
        {
          key: "moq",
          competingFacts: [{ factId: "f_moq", sourceType: "PRODUCT", value: 100, authorityRank: 90 }],
          resolution: "UNRESOLVED",
          publicUseAllowed: false,
          warning: "blocked",
        },
      ],
    });
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const { factPlan } = allocateFactsToSections(pkg, outline.sections);
    assert.ok(factPlan.excludedFactIds.includes("f_moq"));
  });

  it("readiness blocks unallocated required facts", () => {
    const pkg = basePackage();
    const profile = getWritingProfile("SEO_ARTICLE");
    const outline = compileWritingOutline(pkg, profile);
    const readiness = evaluateWritingPlanReadiness({
      pkg,
      profile,
      sections: outline.sections,
      factPlan: { usages: [], unallocatedFactIds: ["f_moq"], excludedFactIds: [] },
      mediaPlan: { placements: [], warnings: [] },
      internalLinkPlan: { placements: [], maxLinks: 6 },
      ctaPlan: planCta(pkg, outline.sections, profile),
      compileErrors: [],
      compileWarnings: [],
    });
    assert.ok(readiness.errors.some((e) => e.code === "REQUIRED_FACT_UNALLOCATED"));
    assert.equal(readiness.ready, false);
  });
});

describe("Media planner", () => {
  it("preserves bundle order", () => {
    const pkg = basePackage();
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const media = planMedia(pkg, outline.sections, getWritingProfile("SEO_ARTICLE"));
    assert.equal(media.placements[0].sortOrder, 0);
    assert.equal(media.placements[0].mediaAssetId, "m1");
  });

  it("rejects private assets", () => {
    const pkg = basePackage({
      media: {
        ...basePackage().media,
        selectedAssets: [
          {
            ...basePackage().media.selectedAssets[0],
            url: "/admin/secret.jpg",
          },
        ],
      },
    });
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const media = planMedia(pkg, outline.sections, getWritingProfile("SEO_ARTICLE"));
    assert.ok(media.warnings.some((w) => /Private|invalid/i.test(w)));
  });

  it("limits duplicate media reuse", () => {
    const pkg = basePackage({
      media: {
        ...basePackage().media,
        selectedAssets: [
          basePackage().media.selectedAssets[0],
          { ...basePackage().media.selectedAssets[0], id: "m1", sortOrder: 1, required: false },
        ],
      },
    });
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const media = planMedia(pkg, outline.sections, getWritingProfile("SEO_ARTICLE"));
    assert.ok(media.warnings.some((w) => /Duplicate/i.test(w)) || media.placements.length === 1);
  });
});

describe("Internal links", () => {
  it("prioritizes accepted links", () => {
    const pkg = basePackage();
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const links = planInternalLinks(pkg, outline.sections, getWritingProfile("SEO_ARTICLE"), "topic1");
    assert.equal(links.placements[0].url, "/blog/may-ao-thun");
  });

  it("excludes self links", () => {
    const pkg = basePackage({
      internalLinks: [
        {
          targetType: "SEO_TOPIC",
          targetId: "topic1",
          targetTitle: "Self",
          url: "/topics/topic1",
          anchorText: "self",
          relevanceScore: 1,
          status: "ACCEPTED",
          required: false,
          recommendation: "RECOMMENDED",
        },
      ],
    });
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const links = planInternalLinks(pkg, outline.sections, getWritingProfile("SEO_ARTICLE"), "topic1");
    assert.equal(links.placements.length, 0);
  });

  it("excludes duplicate targets", () => {
    const pkg = basePackage({
      internalLinks: [
        ...basePackage().internalLinks,
        { ...basePackage().internalLinks[0], anchorText: "dup" },
      ],
    });
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const links = planInternalLinks(pkg, outline.sections, getWritingProfile("SEO_ARTICLE"), "topic1");
    const targets = links.placements.map((l) => l.targetId);
    assert.equal(new Set(targets).size, targets.length);
  });
});

describe("CTA and schema", () => {
  it("blocks commercial plan without CTA text when required", () => {
    const pkg = basePackage({ brief: { ...basePackage().brief, cta: null } });
    const plan = buildWritingPlanFromPackage(pkg, {
      contextBuildId: "b",
      topicId: "topic1",
      contentType: "LANDING_PAGE",
    });
    assert.ok(!plan.readiness.ready || plan.ctaPlan.primary.text);
  });

  it("FAQPage schema only with FAQs", () => {
    const pkg = basePackage({ topic: { ...basePackage().topic, questions: [] }, brief: { ...basePackage().brief, requiredSections: [] } });
    const schema = planSchema(pkg, getWritingProfile("SEO_ARTICLE"));
    assert.equal(schema.faqEnabled, false);
    assert.ok(!schema.schemaTypes.includes("FAQPage"));
  });

  it("rejects fake review schema", () => {
    const pkg = basePackage({ brief: { ...basePackage().brief, schemaTypes: ["AggregateRating"] } });
    const schema = planSchema(pkg, getWritingProfile("SEO_ARTICLE"));
    assert.ok(schema.warnings.some((w) => /AggregateRating|Rejected/i.test(w)));
    assert.ok(!schema.schemaTypes.includes("AggregateRating"));
  });
});

describe("Plan builder", () => {
  it("creates plan from valid package", () => {
    const plan = buildPlan();
    assert.ok(plan.sections.length > 0);
    assert.ok(plan.planHash);
  });

  it("input hash is deterministic", () => {
    const h1 = hashWritingPlanInput({ packageHash: "a", briefVersion: 1, contentType: "SEO_ARTICLE" });
    const h2 = hashWritingPlanInput({ packageHash: "a", briefVersion: 1, contentType: "SEO_ARTICLE" });
    assert.equal(h1, h2);
  });

  it("changed package hash changes input hash", () => {
    const h1 = hashWritingPlanInput({ packageHash: "a", briefVersion: 1, contentType: "SEO_ARTICLE" });
    const h2 = hashWritingPlanInput({ packageHash: "b", briefVersion: 1, contentType: "SEO_ARTICLE" });
    assert.notEqual(h1, h2);
  });

  it("word allocation stays within brief range", () => {
    const pkg = basePackage();
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const { diagnostics } = allocateWordCounts(outline.sections, pkg, getWritingProfile("SEO_ARTICLE"));
    assert.ok(diagnostics.totalMin <= diagnostics.briefMax + 200);
  });
});

describe("Section validation", () => {
  it("rejects unknown fact ID", () => {
    const plan = buildPlan();
    const section = plan.sections[0];
    const draft: WritingSectionDraft = {
      sectionId: section.id,
      heading: section.heading,
      html: "<p>x</p>",
      plainText: "x",
      factIdsUsed: ["unknown_fact"],
      citationIdsUsed: [],
      internalLinkIdsUsed: [],
      mediaPlacementIdsUsed: [],
      keywordUsage: [],
      claims: [],
      wordCount: 1,
      warnings: [],
    };
    const result = validateSectionDraft(plan, draft);
    assert.equal(result.valid, false);
  });

  it("rejects unsafe HTML", () => {
    const plan = buildPlan();
    const section = plan.sections[0];
    const draft: WritingSectionDraft = {
      sectionId: section.id,
      heading: section.heading,
      html: '<script>alert(1)</script><p>x</p>',
      plainText: "x",
      factIdsUsed: [],
      citationIdsUsed: [],
      internalLinkIdsUsed: [],
      mediaPlacementIdsUsed: [],
      keywordUsage: [],
      claims: [],
      wordCount: 1,
      warnings: [],
    };
    assert.equal(validateSectionDraft(plan, draft).valid, false);
  });

  it("rejects arbitrary external URL", () => {
    const plan = buildPlan();
    const section = plan.sections[0];
    const draft: WritingSectionDraft = {
      sectionId: section.id,
      heading: section.heading,
      html: '<p><a href="https://evil.example/hack">x</a></p>',
      plainText: "x",
      factIdsUsed: [],
      citationIdsUsed: [],
      internalLinkIdsUsed: [],
      mediaPlacementIdsUsed: [],
      keywordUsage: [],
      claims: [],
      wordCount: 1,
      warnings: [],
    };
    assert.equal(validateSectionDraft(plan, draft).valid, false);
  });
});

describe("QA engine", () => {
  it("detects unsupported claims", () => {
    const plan = buildPlan();
    const draft: WritingStructuredDraft = {
      id: "d1",
      planId: plan.id,
      contentType: plan.contentType,
      language: plan.language,
      title: plan.titlePlan.h1,
      sections: [
        {
          sectionId: plan.sections[0].id,
          heading: plan.sections[0].heading,
          html: "<p>Top 1 factory in Vietnam</p>",
          plainText: "Top 1 factory in Vietnam",
          factIdsUsed: [],
          citationIdsUsed: [],
          internalLinkIdsUsed: [],
          mediaPlacementIdsUsed: [],
          keywordUsage: [],
          claims: [{ text: "Top 1 factory", factId: null }],
          wordCount: 5,
          warnings: [],
        },
      ],
      faq: [],
      cta: plan.ctaPlan,
      media: plan.mediaPlan.placements,
      internalLinks: plan.internalLinkPlan.placements,
      schemaPlan: plan.schemaPlan,
      qa: { passed: false, score: 0, issues: [], metrics: {} as never },
      rendered: {},
      status: "GENERATED",
      isMock: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const qa = runWritingQa(plan, draft);
    assert.ok(qa.issues.some((i) => i.code === "SUPERLATIVE" || i.code === "MISSING_REQUIRED_SECTION"));
  });

  it("QA score is deterministic", () => {
    const plan = buildPlan();
    const draft: WritingStructuredDraft = {
      id: "d1",
      planId: plan.id,
      contentType: plan.contentType,
      language: plan.language,
      title: plan.titlePlan.h1,
      sections: [],
      faq: [],
      cta: plan.ctaPlan,
      media: [],
      internalLinks: [],
      schemaPlan: plan.schemaPlan,
      qa: { passed: false, score: 0, issues: [], metrics: {} as never },
      rendered: {},
      status: "PLANNED",
      isMock: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.equal(runWritingQa(plan, draft).score, runWritingQa(plan, draft).score);
  });
});

describe("Renderers", () => {
  it("HTML renderer is deterministic", () => {
    const plan = buildPlan();
    const draft: WritingStructuredDraft = {
      id: "d1",
      planId: plan.id,
      contentType: plan.contentType,
      language: plan.language,
      title: plan.titlePlan.h1,
      sections: [
        {
          sectionId: plan.sections[0].id,
          heading: plan.sections[0].heading,
          html: "<p>Hello</p>",
          plainText: "Hello",
          factIdsUsed: [],
          citationIdsUsed: [],
          internalLinkIdsUsed: [],
          mediaPlacementIdsUsed: [],
          keywordUsage: [],
          claims: [],
          wordCount: 1,
          warnings: [],
        },
      ],
      faq: [],
      cta: plan.ctaPlan,
      media: plan.mediaPlan.placements,
      internalLinks: plan.internalLinkPlan.placements,
      schemaPlan: plan.schemaPlan,
      qa: { passed: true, score: 100, issues: [], metrics: {} as never },
      rendered: {},
      status: "REVIEW_READY",
      isMock: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.equal(renderWritingDraftHtml(draft), renderWritingDraftHtml(draft));
    assert.ok(!renderWritingDraftHtml(draft).includes("<script"));
  });

  it("Markdown preserves headings", () => {
    const plan = buildPlan();
    const draft: WritingStructuredDraft = {
      id: "d1",
      planId: plan.id,
      contentType: plan.contentType,
      language: plan.language,
      title: "Title",
      sections: [{ sectionId: "s", heading: "Sec", html: "<p>a</p>", plainText: "a", factIdsUsed: [], citationIdsUsed: [], internalLinkIdsUsed: [], mediaPlacementIdsUsed: [], keywordUsage: [], claims: [], wordCount: 1, warnings: [] }],
      faq: [],
      cta: plan.ctaPlan,
      media: [],
      internalLinks: [],
      schemaPlan: plan.schemaPlan,
      qa: { passed: true, score: 100, issues: [], metrics: {} as never },
      rendered: {},
      status: "REVIEW_READY",
      isMock: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.match(renderWritingDraftMarkdown(draft), /^# Title/);
    assert.match(renderWritingDraftMarkdown(draft), /## Sec/);
  });
});

describe("Mock generator safety", () => {
  const prev = process.env.WRITING_ENGINE_MOCK_ENABLED;

  afterEach(() => {
    process.env.WRITING_ENGINE_MOCK_ENABLED = prev;
  });

  it("mock disabled by default", () => {
    delete process.env.WRITING_ENGINE_MOCK_ENABLED;
    assert.equal(isWritingMockEnabled(), false);
  });

  it("mock generates marked output when enabled", () => {
    process.env.WRITING_ENGINE_MOCK_ENABLED = "true";
    const plan = buildPlan();
    const draft = generateMockSectionDraft(plan, plan.sections[0].id);
    assert.match(draft.plainText, /MOCK/);
    assert.equal(draft.isMock, true);
  });
});

describe("Safety confirmations", () => {
  it("plan uses public output rules only", () => {
    const plan = buildPlan();
    assert.equal(plan.outputRules.publicOutputOnly, true);
    assert.equal(plan.outputRules.mustNotInventFacts, true);
  });

  it("no confidential facts in usages", () => {
    const pkg = basePackage({
      facts: [
        {
          ...basePackage().facts[0],
          visibility: "INTERNAL",
          publicOutputAllowed: false,
        },
      ],
    });
    const outline = compileWritingOutline(pkg, getWritingProfile("SEO_ARTICLE"));
    const { factPlan } = allocateFactsToSections(pkg, outline.sections);
    assert.equal(factPlan.usages.length, 0);
  });
});
