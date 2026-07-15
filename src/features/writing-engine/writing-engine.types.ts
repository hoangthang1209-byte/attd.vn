/**
 * Provider-neutral Writing Engine contracts (Sprint 11.3).
 * LLM providers receive only section-scoped WritingSectionRequest — never raw business tables.
 */

export const WRITING_ENGINE_VERSION = "writing-engine-v1";
export const WRITING_PROFILE_VERSION = "writing-profiles-v1";

export const WRITING_CONTENT_TYPES = [
  "SEO_ARTICLE",
  "LANDING_PAGE",
  "PRODUCT_GUIDE",
  "CASE_STUDY",
  "KNOWLEDGE_ARTICLE",
  "FAQ_PAGE",
  "CAPABILITY_PAGE",
  "OTHER",
] as const;

export type WritingContentType = (typeof WRITING_CONTENT_TYPES)[number];

export const WRITING_PLAN_STATUSES = ["DRAFT", "READY", "INVALID", "SUPERSEDED", "ARCHIVED"] as const;
export type WritingPlanStatus = (typeof WRITING_PLAN_STATUSES)[number];

export const WRITING_DRAFT_STATUSES = [
  "PLANNED",
  "GENERATING",
  "GENERATED",
  "QA_FAILED",
  "REVIEW_READY",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
] as const;
export type WritingDraftStatus = (typeof WRITING_DRAFT_STATUSES)[number];

export const WRITING_SECTION_TYPES = [
  "INTRODUCTION",
  "SUMMARY",
  "INFORMATIONAL",
  "COMMERCIAL",
  "PRODUCT",
  "MATERIAL",
  "PROCESS",
  "TECHNIQUE",
  "MANUFACTURING",
  "COMPARISON",
  "PRICING",
  "FAQ",
  "CASE_STUDY",
  "CTA",
  "CONCLUSION",
  "OTHER",
] as const;
export type WritingSectionType = (typeof WRITING_SECTION_TYPES)[number];

export const WRITING_SECTION_STATUSES = [
  "PLANNED",
  "READY",
  "BLOCKED",
  "GENERATED",
  "QA_FAILED",
  "APPROVED",
] as const;
export type WritingSectionStatus = (typeof WRITING_SECTION_STATUSES)[number];

export const WRITING_SEVERITIES = ["INFO", "WARNING", "ERROR", "BLOCKING"] as const;
export type WritingSeverity = (typeof WRITING_SEVERITIES)[number];

export type WritingIssue = {
  code: string;
  severity: WritingSeverity;
  message: string;
  sectionId?: string | null;
  factId?: string | null;
};

export type WritingSectionPlan = {
  id: string;
  sectionKey: string;
  type: WritingSectionType;
  headingLevel: 1 | 2 | 3;
  heading: string;
  purpose: string;
  required: boolean;
  sortOrder: number;
  targetWordCountMin: number;
  targetWordCountMax: number;
  requiredFactIds: string[];
  optionalFactIds: string[];
  businessRuleIds: string[];
  mediaAssetIds: string[];
  mediaSlotTypes: string[];
  internalLinkIds: string[];
  citationIds: string[];
  requiredKeywords: string[];
  optionalKeywords: string[];
  prohibitedClaims: string[];
  instructions: string[];
  status: WritingSectionStatus;
  blockingIssues: WritingIssue[];
};

export type WritingTitlePlan = {
  h1: string;
  alternatives: string[];
  rules: string[];
};

export type WritingMetadataPlan = {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
};

export type WritingFactUsage = {
  factId: string;
  sectionId: string;
  required: boolean;
  allowedParaphrase: boolean;
  mustUseExactValue: boolean;
  citationRequired: boolean;
  publicUseAllowed: boolean;
  usageNotes: string[];
};

export type WritingFactPlan = {
  usages: WritingFactUsage[];
  unallocatedFactIds: string[];
  excludedFactIds: string[];
};

export type WritingCitation = {
  id: string;
  factId: string;
  sourceType: string;
  sourceId: string;
  sourceTitle: string;
  evidenceUrl?: string | null;
  publicUrl?: string | null;
  displayMode: "INTERNAL_TRACE" | "PUBLIC_LINK" | "EVIDENCE_LINK" | "NONE";
  required: boolean;
};

export type WritingCitationPlan = {
  citations: WritingCitation[];
};

export type WritingMediaPlacement = {
  id: string;
  mediaAssetId: string;
  sectionId?: string | null;
  placement:
    | "FEATURED"
    | "OG_IMAGE"
    | "COVER"
    | "INLINE_BEFORE"
    | "INLINE_AFTER"
    | "GALLERY"
    | "BACKGROUND";
  required: boolean;
  sortOrder: number;
  altText: string;
  caption?: string | null;
  sourceSlotType?: string | null;
  warnings: string[];
};

export type WritingMediaPlan = {
  placements: WritingMediaPlacement[];
  warnings: string[];
};

export type WritingInternalLinkPlacement = {
  id: string;
  targetId: string;
  targetTitle: string;
  url: string;
  anchorText: string;
  sectionId: string;
  required: boolean;
  relevanceScore: number;
  placementReason: string;
};

export type WritingInternalLinkPlan = {
  placements: WritingInternalLinkPlacement[];
  maxLinks: number;
};

export type WritingCtaPlan = {
  primary: {
    type: string;
    text: string;
    destination?: string | null;
    sectionId: string;
  };
  secondary?: {
    type: string;
    text: string;
    destination?: string | null;
    sectionId: string;
  } | null;
  rules: string[];
  warnings: string[];
};

export type WritingKeywordPlan = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  sectionAssignments: {
    sectionId: string;
    requiredKeywords: string[];
    optionalKeywords: string[];
  }[];
  prohibitedPatterns: string[];
};

export type WritingSchemaPlan = {
  schemaTypes: string[];
  faqEnabled: boolean;
  breadcrumbEnabled: boolean;
  warnings: string[];
};

export type WritingOutputRules = {
  publicOutputOnly: boolean;
  mustCiteFactIds: boolean;
  mustUseProvidedUrlsOnly: boolean;
  mustNotInventFacts: boolean;
  noScripts: boolean;
  mockAllowed: boolean;
};

export type WritingQaRequirements = {
  minWordCount?: number | null;
  maxWordCount?: number | null;
  minInternalLinks?: number;
  maxInternalLinks?: number;
  requireFeaturedMedia: boolean;
  requireCta: boolean;
};

export type WritingPlanReadiness = {
  ready: boolean;
  score: number;
  errors: WritingIssue[];
  warnings: WritingIssue[];
};

export type WritingSourceManifestItem = {
  factId: string;
  sourceType: string;
  sourceId: string;
  title: string;
};

export type WritingPlan = {
  id: string;
  version: string;
  contentType: WritingContentType;
  contextBuildId: string;
  topicId: string;
  briefId?: string | null;
  language: string;
  titlePlan: WritingTitlePlan;
  metadataPlan: WritingMetadataPlan;
  sections: WritingSectionPlan[];
  factPlan: WritingFactPlan;
  citationPlan: WritingCitationPlan;
  mediaPlan: WritingMediaPlan;
  internalLinkPlan: WritingInternalLinkPlan;
  ctaPlan: WritingCtaPlan;
  keywordPlan: WritingKeywordPlan;
  schemaPlan: WritingSchemaPlan;
  outputRules: WritingOutputRules;
  qaRequirements: WritingQaRequirements;
  readiness: WritingPlanReadiness;
  sourceManifest: WritingSourceManifestItem[];
  warnings: WritingIssue[];
  planHash: string;
  generatedAt: string;
};

export type WritingSectionFactInput = {
  factId: string;
  statement: string;
  structuredValue?: Record<string, unknown> | null;
  mustUseExactValue: boolean;
};

export type WritingSectionRuleInput = {
  ruleId: string;
  title: string;
  outcome: Record<string, unknown>;
};

export type WritingSectionRequest = {
  planId: string;
  sectionId: string;
  contentType: WritingContentType;
  language: string;
  heading: string;
  purpose: string;
  targetWordCountMin: number;
  targetWordCountMax: number;
  facts: WritingSectionFactInput[];
  businessRules: WritingSectionRuleInput[];
  citations: WritingCitation[];
  mediaPlacements: WritingMediaPlacement[];
  internalLinks: WritingInternalLinkPlacement[];
  keywords: { required: string[]; optional: string[] };
  brandRules: string[];
  outputRules: string[];
  prohibitedClaims: string[];
  previousSectionSummary?: string | null;
  nextSectionPurpose?: string | null;
};

export type WritingSectionDraft = {
  sectionId: string;
  heading: string;
  html: string;
  plainText: string;
  factIdsUsed: string[];
  citationIdsUsed: string[];
  internalLinkIdsUsed: string[];
  mediaPlacementIdsUsed: string[];
  keywordUsage: string[];
  claims: { text: string; factId?: string | null }[];
  wordCount: number;
  warnings: string[];
  isMock?: boolean;
};

export type WritingQaIssue = {
  code: string;
  severity: WritingSeverity;
  message: string;
  sectionId?: string | null;
  factId?: string | null;
  linkId?: string | null;
  mediaAssetId?: string | null;
  suggestedFix?: string | null;
};

export type WritingQaReport = {
  passed: boolean;
  score: number;
  issues: WritingQaIssue[];
  metrics: {
    totalWords: number;
    sectionCount: number;
    requiredFactCoverage: number;
    usedFactCount: number;
    unsupportedClaimCount: number;
    internalLinkCount: number;
    mediaCount: number;
    missingAltCount: number;
    headingErrors: number;
    keywordWarnings: number;
  };
};

export type WritingStructuredDraft = {
  id: string;
  planId: string;
  contentType: WritingContentType;
  language: string;
  title: string;
  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  sections: WritingSectionDraft[];
  faq: { question: string; answerHtml: string; factIdsUsed: string[] }[];
  cta: WritingCtaPlan;
  media: WritingMediaPlacement[];
  internalLinks: WritingInternalLinkPlacement[];
  schemaPlan: WritingSchemaPlan;
  qa: WritingQaReport;
  rendered: { html?: string | null; markdown?: string | null; plainText?: string | null };
  status: WritingDraftStatus;
  isMock: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BuildWritingPlanRequest = {
  contextBuildId: string;
  topicId: string;
  contentType: WritingContentType;
  forceRebuild?: boolean;
  language?: string;
};

export interface WritingSectionProvider {
  generateSection(request: WritingSectionRequest): Promise<WritingSectionDraft>;
}
