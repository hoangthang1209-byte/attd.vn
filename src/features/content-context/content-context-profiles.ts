import type {
  AiRetrievalConsumer,
  AiRetrievalPurpose,
  AiRetrievalSourceType,
} from "@/features/ai-retrieval/ai-retrieval-types";
import type {
  ContentContextPurpose,
  ContentContextType,
} from "@/features/content-context/content-context.types";
import { CONTENT_CONTEXT_PROFILE_VERSION } from "@/features/content-context/content-context.types";

export type ContentContextProfile = {
  purpose: ContentContextPurpose;
  profileVersion: string;
  contentType: ContentContextType;
  retrievalConsumer: AiRetrievalConsumer;
  retrievalPurpose: AiRetrievalPurpose;
  allowedSourceTypes: AiRetrievalSourceType[];
  requireBrief: boolean;
  requireApprovedBrief: boolean;
  requireCta: boolean;
  publicOutputOnly: boolean;
  requiredFactCategories: string[];
  preferredFactCategories: string[];
  requiredMediaSlots: string[];
  preferredMediaSlots: string[];
  minAcceptedInternalLinks: number;
  defaultMaxCharacters: number;
  defaultMaxFacts: number;
  defaultMaxMediaAssets: number;
  defaultMaxInternalLinks: number;
  allowSuggestedInternalLinks: boolean;
};

const SEO_SOURCES: AiRetrievalSourceType[] = [
  "KNOWLEDGE_BASE",
  "PRODUCT",
  "MANUFACTURING_ASSET",
  "MEDIA_BUNDLE",
  "MEDIA_ASSET",
  "SEO_TOPIC",
  "SEO_BRIEF",
  "CATEGORY",
];

const PROFILES: Record<ContentContextPurpose, ContentContextProfile> = {
  SEO_ARTICLE: {
    purpose: "SEO_ARTICLE",
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentType: "ARTICLE",
    retrievalConsumer: "SEO_CONTENT",
    retrievalPurpose: "CONTENT_WRITING",
    allowedSourceTypes: SEO_SOURCES,
    requireBrief: true,
    requireApprovedBrief: true,
    requireCta: false,
    publicOutputOnly: true,
    requiredFactCategories: ["product", "knowledge", "seo"],
    preferredFactCategories: ["manufacturing", "media"],
    requiredMediaSlots: ["FEATURED", "INLINE", "OG_IMAGE"],
    preferredMediaSlots: ["PROCESS", "MATERIAL", "FACTORY"],
    minAcceptedInternalLinks: 0,
    defaultMaxCharacters: 40000,
    defaultMaxFacts: 40,
    defaultMaxMediaAssets: 12,
    defaultMaxInternalLinks: 8,
    allowSuggestedInternalLinks: true,
  },
  SEO_LANDING_PAGE: {
    purpose: "SEO_LANDING_PAGE",
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentType: "LANDING_PAGE",
    retrievalConsumer: "SEO_CONTENT",
    retrievalPurpose: "CONTENT_WRITING",
    allowedSourceTypes: SEO_SOURCES,
    requireBrief: true,
    requireApprovedBrief: true,
    requireCta: true,
    publicOutputOnly: true,
    requiredFactCategories: ["product", "capability", "knowledge"],
    preferredFactCategories: ["manufacturing", "moq", "lead_time"],
    requiredMediaSlots: ["HERO", "PRODUCT", "PROCESS", "OG_IMAGE"],
    preferredMediaSlots: ["FACTORY", "TESTIMONIAL"],
    minAcceptedInternalLinks: 0,
    defaultMaxCharacters: 45000,
    defaultMaxFacts: 45,
    defaultMaxMediaAssets: 16,
    defaultMaxInternalLinks: 10,
    allowSuggestedInternalLinks: true,
  },
  PRODUCT_GUIDE: {
    purpose: "PRODUCT_GUIDE",
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentType: "PRODUCT_CONTENT",
    retrievalConsumer: "SEO_CONTENT",
    retrievalPurpose: "CONTENT_WRITING",
    allowedSourceTypes: SEO_SOURCES,
    requireBrief: true,
    requireApprovedBrief: false,
    requireCta: true,
    publicOutputOnly: true,
    requiredFactCategories: ["product"],
    preferredFactCategories: ["material", "manufacturing"],
    requiredMediaSlots: ["FEATURED", "PRODUCT"],
    preferredMediaSlots: ["MATERIAL", "PROCESS", "OG_IMAGE"],
    minAcceptedInternalLinks: 0,
    defaultMaxCharacters: 35000,
    defaultMaxFacts: 35,
    defaultMaxMediaAssets: 14,
    defaultMaxInternalLinks: 6,
    allowSuggestedInternalLinks: true,
  },
  CASE_STUDY: {
    purpose: "CASE_STUDY",
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentType: "CASE_STUDY",
    retrievalConsumer: "SEO_CONTENT",
    retrievalPurpose: "CONTENT_WRITING",
    allowedSourceTypes: SEO_SOURCES,
    requireBrief: true,
    requireApprovedBrief: true,
    requireCta: false,
    publicOutputOnly: true,
    requiredFactCategories: ["case_study", "product"],
    preferredFactCategories: ["manufacturing"],
    requiredMediaSlots: ["FEATURED", "PROCESS"],
    preferredMediaSlots: ["FACTORY", "PRODUCT", "OG_IMAGE"],
    minAcceptedInternalLinks: 0,
    defaultMaxCharacters: 38000,
    defaultMaxFacts: 30,
    defaultMaxMediaAssets: 12,
    defaultMaxInternalLinks: 6,
    allowSuggestedInternalLinks: false,
  },
  KNOWLEDGE_ARTICLE: {
    purpose: "KNOWLEDGE_ARTICLE",
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentType: "ARTICLE",
    retrievalConsumer: "SEO_CONTENT",
    retrievalPurpose: "CONTENT_WRITING",
    allowedSourceTypes: SEO_SOURCES,
    requireBrief: true,
    requireApprovedBrief: false,
    requireCta: false,
    publicOutputOnly: true,
    requiredFactCategories: ["knowledge"],
    preferredFactCategories: ["product", "manufacturing"],
    requiredMediaSlots: ["FEATURED", "INLINE"],
    preferredMediaSlots: ["OG_IMAGE"],
    minAcceptedInternalLinks: 0,
    defaultMaxCharacters: 36000,
    defaultMaxFacts: 35,
    defaultMaxMediaAssets: 10,
    defaultMaxInternalLinks: 8,
    allowSuggestedInternalLinks: true,
  },
  CONTENT_REVIEW: {
    purpose: "CONTENT_REVIEW",
    profileVersion: CONTENT_CONTEXT_PROFILE_VERSION,
    contentType: "OTHER",
    retrievalConsumer: "SEO_CONTENT",
    retrievalPurpose: "CONTENT_REVIEW",
    allowedSourceTypes: SEO_SOURCES,
    requireBrief: false,
    requireApprovedBrief: false,
    requireCta: false,
    publicOutputOnly: true,
    requiredFactCategories: [],
    preferredFactCategories: ["knowledge", "product", "seo"],
    requiredMediaSlots: [],
    preferredMediaSlots: ["FEATURED"],
    minAcceptedInternalLinks: 0,
    defaultMaxCharacters: 50000,
    defaultMaxFacts: 50,
    defaultMaxMediaAssets: 20,
    defaultMaxInternalLinks: 12,
    allowSuggestedInternalLinks: true,
  },
};

export function getContentContextProfile(purpose: ContentContextPurpose): ContentContextProfile {
  const profile = PROFILES[purpose];
  if (!profile) {
    throw new Error(`Unsupported content context purpose: ${String(purpose)}`);
  }
  return profile;
}

export function isContentContextPurpose(value: string): value is ContentContextPurpose {
  return value in PROFILES;
}
