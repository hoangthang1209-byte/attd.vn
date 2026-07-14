/**
 * Provider-neutral Content Context Package contract (Sprint 11.2).
 * Future writers consume this package — they must not assemble raw context themselves.
 */

export const CONTENT_CONTEXT_BUILDER_VERSION = "content-context-v1";
export const CONTENT_CONTEXT_PROFILE_VERSION = "content-context-profiles-v1";

export const CONTENT_CONTEXT_PURPOSES = [
  "SEO_ARTICLE",
  "SEO_LANDING_PAGE",
  "PRODUCT_GUIDE",
  "CASE_STUDY",
  "KNOWLEDGE_ARTICLE",
  "CONTENT_REVIEW",
] as const;

export type ContentContextPurpose = (typeof CONTENT_CONTEXT_PURPOSES)[number];

export const CONTENT_CONTEXT_TYPES = [
  "ARTICLE",
  "LANDING_PAGE",
  "PRODUCT_CONTENT",
  "CASE_STUDY",
  "FAQ",
  "OTHER",
] as const;

export type ContentContextType = (typeof CONTENT_CONTEXT_TYPES)[number];

export type ContentContextOutlineItem = {
  level: "H2" | "H3";
  heading: string;
  purpose?: string;
  notes?: string;
  required?: boolean;
  sortOrder: number;
};

export type ContentContextCta = {
  type?: string | null;
  text?: string | null;
};

export type ContentContextFact = {
  factId: string;
  statement: string;
  structuredValue?: Record<string, unknown> | null;
  sourceType: string;
  sourceId: string;
  sourceTitle: string;
  authorityRank: number;
  visibility: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
  publicOutputAllowed: boolean;
  claimStatus?: string | null;
  confidence?: number | null;
  evidenceUrl?: string | null;
  lastVerifiedAt?: string | null;
  stale: boolean;
  required: boolean;
  matchedOn: string[];
  warnings: string[];
  priorityScore: number;
};

export type ContentContextBusinessRule = {
  ruleId: string;
  title: string;
  condition?: Record<string, unknown> | null;
  outcome: Record<string, unknown>;
  exceptions?: Record<string, unknown>[];
  appliesTo?: string[];
  priority: number;
  sourceFactId: string;
  required: boolean;
  publicOutputAllowed: boolean;
};

export type ContentContextProhibitedClaim = {
  key: string;
  reason: string;
  sourceId?: string | null;
  examples: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
};

export type ContentContextMissingFact = {
  key: string;
  description: string;
  requiredForSections: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  suggestedKnowledgeDomain?: string | null;
  blocking: boolean;
};

export type ContentContextConflict = {
  key: string;
  competingFacts: Array<{
    factId: string;
    sourceType: string;
    value: unknown;
    authorityRank: number;
  }>;
  selectedFactId?: string | null;
  resolution: string;
  publicUseAllowed: boolean;
  warning: string;
};

export type ContentContextInternalLink = {
  targetType: "SEO_TOPIC" | "URL" | "OTHER";
  targetId?: string | null;
  targetTitle: string;
  url: string;
  anchorText: string;
  reason?: string | null;
  relevanceScore: number;
  status: string;
  required: boolean;
  recommendation: "REQUIRED" | "RECOMMENDED" | "OPTIONAL";
  sourceOpportunityId?: string | null;
};

export type ContentContextMediaAsset = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  orientation?: string | null;
  seoScore?: number | null;
  library?: string | null;
  role?: string | null;
  contentSuitabilities: string[];
  slotType: string;
  sortOrder: number;
  required: boolean;
  selected: boolean;
  warnings: string[];
};

export type ContentContextMediaSlot = {
  slotType: string;
  label: string;
  required: boolean;
  minAssets: number;
  assetCount: number;
  status: "MISSING" | "LOW" | "ENOUGH" | "STRONG";
  warnings: string[];
};

export type ContentContextMediaBundle = {
  id: string;
  name: string;
  contentType: string;
  status: string;
};

export type ContentContextMediaCoverage = {
  overallScore: number | null;
  overallStatus: string | null;
  missingRequiredSlots: string[];
};

export type ContentContextSourceManifestItem = {
  factId: string;
  sourceType: string;
  sourceId: string;
  title: string;
  visibility: string;
};

export type ContentContextOmittedItem = {
  reason: string;
  count: number;
};

export type ContentContextPackage = {
  id: string;
  version: string;
  profileVersion: string;
  contentPurpose: ContentContextPurpose;
  contentType: ContentContextType;
  language: string;

  entity: {
    topicId: string;
    briefId?: string | null;
    strategyId?: string | null;
    clusterId?: string | null;
    mediaBundleId?: string | null;
    briefVersion?: number | null;
  };

  topic: {
    title: string;
    primaryKeyword: string;
    searchIntent: string;
    funnelStage: string;
    targetAudience: string[];
    supportingKeywords: string[];
    questions: string[];
    entities: string[];
  };

  brief: {
    workingTitle?: string | null;
    proposedSlug?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    audienceNotes?: string | null;
    valueProposition?: string | null;
    outline: ContentContextOutlineItem[];
    requiredSections: string[];
    cta?: ContentContextCta | null;
    wordCount?: { min?: number | null; max?: number | null };
    schemaTypes: string[];
    approved: boolean;
    version?: number | null;
  };

  facts: ContentContextFact[];
  businessRules: ContentContextBusinessRule[];
  prohibitedClaims: ContentContextProhibitedClaim[];
  conflicts: ContentContextConflict[];
  missingFacts: ContentContextMissingFact[];

  media: {
    bundle?: ContentContextMediaBundle | null;
    slots: ContentContextMediaSlot[];
    selectedAssets: ContentContextMediaAsset[];
    coverage: ContentContextMediaCoverage;
    warnings: string[];
  };

  internalLinks: ContentContextInternalLink[];

  brand: {
    tone?: string | null;
    voiceRules: string[];
    requiredPhrases: string[];
    prohibitedPhrases: string[];
    terminology: Record<string, string>;
  };

  outputRules: {
    publicOutputOnly: boolean;
    mustCiteFactIds: boolean;
    mustUseProvidedUrlsOnly: boolean;
    mustNotInventFacts: boolean;
    mustSurfaceConflicts: boolean;
    mustRespectMediaAssignments: boolean;
    maxHeadingDepth: number;
    requiredSections: string[];
    prohibitedTopics: string[];
  };

  sourceManifest: ContentContextSourceManifestItem[];
  omittedSummary: ContentContextOmittedItem[];
  warnings: string[];

  budget: {
    requestedMaxCharacters: number;
    actualCharacters: number;
    estimatedInputTokens?: number | null;
    sectionsTrimmed: string[];
    factsDropped: number;
    mediaDropped: number;
    linksDropped: number;
  };

  diagnostics: ContentContextDiagnostics;

  contextText: string;
  contextJson: Record<string, unknown>;

  retrievalRequestId: string;
  packageHash: string;
  generatedAt: string;
};

export type ContentContextDiagnostics = {
  factCount: number;
  requiredFactCount: number;
  sourceDistribution: Record<string, number>;
  authorityBands: Record<string, number>;
  staleCount: number;
  legacyCompatibilityCount: number;
  conflictCount: number;
  blockingConflictCount: number;
  mediaSelectedCount: number;
  missingRequiredSlots: string[];
  internalLinkCount: number;
  actualCharacters: number;
  estimatedTokens: number;
  trimmedFacts: number;
  trimmedAssets: number;
  trimmedLinks: number;
  readinessScore: number;
};

export type ContentContextBriefReadiness = {
  ready: boolean;
  score: number;
  errors: string[];
  warnings: string[];
};

export type BuildContentContextRequest = {
  topicId: string;
  purpose: ContentContextPurpose;
  preview?: boolean;
  language?: string;
  maxCharacters?: number;
  maxFacts?: number;
  maxMediaAssets?: number;
  includeSuggestedInternalLinks?: boolean;
  includeMedia?: boolean;
  includeBusinessRules?: boolean;
  includeWarnings?: boolean;
  forceRefreshRetrieval?: boolean;
};

export type ContentWriterInput = {
  contextBuildId: string;
  approvedBriefVersion: number;
  outputFormat: "MARKDOWN" | "HTML" | "STRUCTURED";
};
