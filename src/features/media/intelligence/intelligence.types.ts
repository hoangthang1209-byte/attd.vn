/**
 * Sprint 14.4 — Intelligent Media Library foundation types.
 * Deterministic only. No embeddings / Vision AI.
 */

import type {
  MediaAiProcessingStatus,
  MediaBundleSlotType,
  MediaContentSuitability,
  MediaOrientation,
  MediaVisibility,
} from "@prisma/client";

export type MediaIngestStage =
  | "UPLOAD"
  | "PROCESSING"
  | "METADATA"
  | "REVIEW"
  | "PUBLIC"
  | "AVAILABLE";

export type ClassifierLabel =
  | "polo"
  | "tshirt"
  | "hoodie"
  | "jacket"
  | "hat"
  | "bag"
  | "bottle"
  | "label"
  | "fabric"
  | "closeup"
  | "logo"
  | "embroidery"
  | "silkscreen"
  | "dtf"
  | "heat_transfer"
  | "factory"
  | "qc"
  | "packing"
  | "shipping"
  | "lifestyle"
  | "team"
  | "showroom"
  | "machine"
  | "unknown";

export type SuggestedMediaMetadata = {
  title: string | null;
  suggestedFilename: string | null;
  altText: string | null;
  caption: string | null;
  keywords: string[];
  suggestedRoleCode: string | null;
  suggestedLibraryCode: string | null;
  suggestedBundleSlots: MediaBundleSlotType[];
  orientation: MediaOrientation | null;
  aspectRatio: string | null;
  primaryColors: string[];
  suggestedProductTerms: string[];
  suggestedIndustryTerms: string[];
  suggestedUseCaseTerms: string[];
  suggestedTechniqueTerms: string[];
  suggestedMaterialTerms: string[];
  suggestedSubjectTerms: string[];
  suggestedSuitabilities: MediaContentSuitability[];
  classifierLabels: ClassifierLabel[];
  confidence: number;
  source: "DETERMINISTIC";
};

export type AssetHealthBreakdown = {
  seo: number;
  accessibility: number;
  resolution: number;
  crop: number;
  alt: number;
  caption: number;
  duplicate: number;
  visibility: number;
  bundle: number;
  suitability: number;
  usage: number;
  total: number;
  grade: "poor" | "fair" | "good" | "excellent";
  issues: string[];
};

export type BundleCoverageSlot = {
  slotType: MediaBundleSlotType;
  label: string;
  required: boolean;
  filled: boolean;
  assetCount: number;
  minAssets: number;
};

export type BundleCoverageReport = {
  bundleId: string;
  name: string;
  status: string;
  slots: BundleCoverageSlot[];
  filledRequired: number;
  totalRequired: number;
  gaps: string[];
  healthScore: number;
};

export type SimilarAssetHit = {
  mediaAssetId: string;
  title: string | null;
  altText: string | null;
  url: string;
  thumbnailUrl: string | null;
  relation: "DUPLICATE" | "SAME_HASH" | "SAME_PRODUCT" | "SAME_BUNDLE" | "SAME_ROLE" | "SIMILAR_TERMS";
  score: number;
};

export type BetterImageCandidate = {
  mediaAssetId: string;
  title: string | null;
  url: string;
  thumbnailUrl: string | null;
  score: number;
  currentScore: number;
  reason: string;
};

export type MediaTimelineEvent = {
  at: string;
  type: "UPLOADED" | "METADATA" | "REVIEWED" | "USED" | "BUNDLE" | "STATUS";
  summary: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type MediaRelationshipMap = {
  mediaAssetId: string;
  assignments: Array<{
    entityType: string;
    entityId: string;
    placement: string;
  }>;
  bundles: Array<{ bundleId: string; name: string; slotType: string }>;
  blogPosts: Array<{ id: string; title: string; slug: string; status: string }>;
};

export type MediaDashboardSnapshot = {
  totals: {
    assets: number;
    publicAssets: number;
    needsReview: number;
    missingAlt: number;
    duplicates: number;
    unused: number;
    lowSeo: number;
    recentlyUploaded: number;
  };
  byAiStatus: Record<MediaAiProcessingStatus, number>;
  byVisibility: Record<MediaVisibility, number>;
  topUsed: Array<{ mediaAssetId: string; title: string | null; uses: number }>;
  coverageGaps: Array<{ bundleId: string; name: string; gaps: string[] }>;
  canonicalCoverage?: {
    overallMigrationPercent: number;
    categoryPercent: number;
    caseStudyPercent: number;
    productPercent: number;
    brokenUrlCount: number;
    mediaAssetMissingCount: number;
    category: {
      canonical: number;
      legacyOnly: number;
      withMedia: number;
    };
    caseStudy: {
      canonical: number;
      legacyOnly: number;
      withMedia: number;
    };
    product: {
      canonical: number;
      legacyOnly: number;
      withMedia: number;
    };
  };
};

/** Stored under MediaAsset.metadata.intelligent */
export const INTELLIGENT_META_KEY = "intelligent";

export type IntelligentMediaMetaBag = {
  stage: MediaIngestStage;
  suggested: SuggestedMediaMetadata;
  health?: AssetHealthBreakdown;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  processedAt?: string | null;
};
