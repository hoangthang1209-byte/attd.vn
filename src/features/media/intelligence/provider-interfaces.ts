/**
 * Provider interfaces for Sprint 14.4.
 * Default implementations are deterministic. Paid Vision/LLM providers stay optional hooks.
 */

import type {
  BetterImageCandidate,
  ClassifierLabel,
  SimilarAssetHit,
  SuggestedMediaMetadata,
} from "@/features/media/intelligence/intelligence.types";
import type { MediaBundleSlotType } from "@prisma/client";

export type ClassifierInput = {
  filename: string;
  originalName?: string | null;
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  keywords?: string[];
  subjectTerms?: string[];
  materialTerms?: string[];
  techniqueTerms?: string[];
  useCaseTerms?: string[];
  industryTerms?: string[];
  libraryCode?: string | null;
  roleCode?: string | null;
};

export type MetadataProviderInput = ClassifierInput & {
  width?: number | null;
  height?: number | null;
  orientation?: string | null;
  dominantColor?: string | null;
  mimeType?: string | null;
};

export interface MediaClassifier {
  classify(input: ClassifierInput): Promise<{
    labels: ClassifierLabel[];
    confidence: number;
  }>;
}

export interface MetadataProvider {
  suggest(input: MetadataProviderInput): Promise<SuggestedMediaMetadata>;
}

export interface BundleRecommender {
  recommendSlots(input: {
    labels: ClassifierLabel[];
    roleCode?: string | null;
    libraryCode?: string | null;
    suitabilities?: string[];
  }): Promise<MediaBundleSlotType[]>;
}

export interface SimilarityProvider {
  findSimilar(input: {
    mediaAssetId: string;
    limit?: number;
  }): Promise<SimilarAssetHit[]>;
}

export interface BetterImageProvider {
  findBetter(input: {
    mediaAssetId: string;
    context?: { sectionHeading?: string; intent?: string };
  }): Promise<BetterImageCandidate | null>;
}
