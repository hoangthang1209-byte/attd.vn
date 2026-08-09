import type { ContentContextPurpose } from "@prisma/client";
import type {
  WritingContentType,
  WritingOutputRules,
  WritingQaRequirements,
  WritingSectionType,
} from "@/features/writing-engine/writing-engine.types";

export type WritingProfile = {
  id: WritingContentType;
  version: string;
  requiredContextPurpose: ContentContextPurpose;
  supportedContentType: WritingContentType;
  requiredSections: WritingSectionType[];
  optionalSections: WritingSectionType[];
  sectionOrder: WritingSectionType[];
  titleRules: string[];
  metaRules: string[];
  defaultWordCountMin: number;
  defaultWordCountMax: number;
  ctaRules: string[];
  mediaPlacementRules: string[];
  linkRequirements: { min: number; max: number };
  schemaSupport: string[];
  qaThresholds: WritingQaRequirements;
  publicationRestrictions: string[];
  outputRules: WritingOutputRules;
};

const BASE_OUTPUT_RULES: WritingOutputRules = {
  publicOutputOnly: true,
  mustCiteFactIds: true,
  mustUseProvidedUrlsOnly: true,
  mustNotInventFacts: true,
  noScripts: true,
  mockAllowed: false,
};

export const WRITING_PROFILES: Record<WritingContentType, WritingProfile | null> = {
  SEO_ARTICLE: {
    id: "SEO_ARTICLE",
    version: "1",
    requiredContextPurpose: "SEO_ARTICLE",
    supportedContentType: "SEO_ARTICLE",
    requiredSections: ["INTRODUCTION", "CONCLUSION", "CTA"],
    optionalSections: ["FAQ", "COMMERCIAL", "MATERIAL", "PROCESS", "MANUFACTURING", "PRODUCT"],
    sectionOrder: [
      "INTRODUCTION",
      "INFORMATIONAL",
      "COMMERCIAL",
      "MATERIAL",
      "PROCESS",
      "MANUFACTURING",
      "PRODUCT",
      "FAQ",
      "CTA",
      "CONCLUSION",
    ],
    titleRules: ["Primary keyword in H1", "No unsupported superlatives", "Meta title 30-60 chars"],
    metaRules: ["Meta description 120-160 chars", "Slug from brief or topic"],
    defaultWordCountMin: 600,
    defaultWordCountMax: 1600,
    ctaRules: ["Use brief CTA when present", "Soft CTA allowed for informational intent"],
    mediaPlacementRules: ["Featured image required", "Inline media across relevant sections"],
    linkRequirements: { min: 2, max: 6 },
    schemaSupport: ["BlogPosting", "FAQPage", "BreadcrumbList"],
    qaThresholds: {
      minWordCount: 600,
      maxWordCount: 2500,
      minInternalLinks: 2,
      maxInternalLinks: 6,
      requireFeaturedMedia: true,
      requireCta: true,
    },
    publicationRestrictions: ["No invented testimonials", "No confidential facts"],
    outputRules: { ...BASE_OUTPUT_RULES },
  },
  LANDING_PAGE: {
    id: "LANDING_PAGE",
    version: "1",
    requiredContextPurpose: "SEO_LANDING_PAGE",
    supportedContentType: "LANDING_PAGE",
    requiredSections: ["INTRODUCTION", "COMMERCIAL", "CTA"],
    optionalSections: ["PROCESS", "MANUFACTURING", "FAQ", "PRODUCT"],
    sectionOrder: [
      "INTRODUCTION",
      "COMMERCIAL",
      "PRODUCT",
      "PROCESS",
      "MANUFACTURING",
      "FAQ",
      "CTA",
    ],
    titleRules: ["Hero headline from brief", "Strong value proposition"],
    metaRules: ["Conversion-focused meta", "Slug normalized"],
    defaultWordCountMin: 600,
    defaultWordCountMax: 1500,
    ctaRules: ["Strong primary CTA required", "No invented quote URLs"],
    mediaPlacementRules: ["Hero/cover required", "Landing-specific bundle slots"],
    linkRequirements: { min: 1, max: 4 },
    schemaSupport: ["Organization", "BreadcrumbList"],
    qaThresholds: {
      minWordCount: 600,
      maxWordCount: 1800,
      minInternalLinks: 1,
      maxInternalLinks: 4,
      requireFeaturedMedia: true,
      requireCta: true,
    },
    publicationRestrictions: ["No invented testimonials", "No unverified customer names"],
    outputRules: { ...BASE_OUTPUT_RULES },
  },
  PRODUCT_GUIDE: {
    id: "PRODUCT_GUIDE",
    version: "1",
    requiredContextPurpose: "PRODUCT_GUIDE",
    supportedContentType: "PRODUCT_GUIDE",
    requiredSections: ["INTRODUCTION", "PRODUCT", "CONCLUSION"],
    optionalSections: ["MATERIAL", "PROCESS", "TECHNIQUE", "FAQ", "CTA"],
    sectionOrder: [
      "INTRODUCTION",
      "PRODUCT",
      "MATERIAL",
      "TECHNIQUE",
      "PROCESS",
      "FAQ",
      "CTA",
      "CONCLUSION",
    ],
    titleRules: ["Product-focused H1"],
    metaRules: ["Guide-oriented description"],
    defaultWordCountMin: 700,
    defaultWordCountMax: 1800,
    ctaRules: ["Product inquiry CTA when commercial"],
    mediaPlacementRules: ["Product images prioritized"],
    linkRequirements: { min: 2, max: 5 },
    schemaSupport: ["Article", "Product", "BreadcrumbList"],
    qaThresholds: {
      minWordCount: 700,
      maxWordCount: 2000,
      minInternalLinks: 2,
      maxInternalLinks: 5,
      requireFeaturedMedia: true,
      requireCta: false,
    },
    publicationRestrictions: ["No pricing without facts"],
    outputRules: { ...BASE_OUTPUT_RULES },
  },
  CASE_STUDY: {
    id: "CASE_STUDY",
    version: "1",
    requiredContextPurpose: "CASE_STUDY",
    supportedContentType: "CASE_STUDY",
    requiredSections: ["INTRODUCTION", "CASE_STUDY", "CONCLUSION"],
    optionalSections: ["PROCESS", "MANUFACTURING", "CTA"],
    sectionOrder: ["INTRODUCTION", "CASE_STUDY", "PROCESS", "MANUFACTURING", "CTA", "CONCLUSION"],
    titleRules: ["No unverified customer names"],
    metaRules: ["Evidence-based claims only"],
    defaultWordCountMin: 800,
    defaultWordCountMax: 2000,
    ctaRules: ["Contact CTA optional"],
    mediaPlacementRules: ["Process/factory images when available"],
    linkRequirements: { min: 1, max: 4 },
    schemaSupport: ["Article", "BreadcrumbList"],
    qaThresholds: {
      minWordCount: 800,
      maxWordCount: 2200,
      minInternalLinks: 1,
      maxInternalLinks: 4,
      requireFeaturedMedia: false,
      requireCta: false,
    },
    publicationRestrictions: ["No fake customer names", "No invented outcomes"],
    outputRules: { ...BASE_OUTPUT_RULES },
  },
  KNOWLEDGE_ARTICLE: {
    id: "KNOWLEDGE_ARTICLE",
    version: "1",
    requiredContextPurpose: "KNOWLEDGE_ARTICLE",
    supportedContentType: "KNOWLEDGE_ARTICLE",
    requiredSections: ["INTRODUCTION", "CONCLUSION"],
    optionalSections: ["INFORMATIONAL", "FAQ", "PROCESS", "CTA"],
    sectionOrder: ["INTRODUCTION", "INFORMATIONAL", "PROCESS", "FAQ", "CTA", "CONCLUSION"],
    titleRules: ["Educational tone", "No commercial superlatives"],
    metaRules: ["Informational meta description"],
    defaultWordCountMin: 600,
    defaultWordCountMax: 1500,
    ctaRules: ["Soft CTA allowed"],
    mediaPlacementRules: ["Inline explanatory media"],
    linkRequirements: { min: 2, max: 5 },
    schemaSupport: ["Article", "FAQPage", "BreadcrumbList"],
    qaThresholds: {
      minWordCount: 600,
      maxWordCount: 1800,
      minInternalLinks: 2,
      maxInternalLinks: 5,
      requireFeaturedMedia: false,
      requireCta: false,
    },
    publicationRestrictions: ["KB-sourced facts only"],
    outputRules: { ...BASE_OUTPUT_RULES },
  },
  FAQ_PAGE: null,
  CAPABILITY_PAGE: null,
  OTHER: null,
};

export function getWritingProfile(contentType: WritingContentType): WritingProfile {
  const profile = WRITING_PROFILES[contentType];
  if (!profile) {
    throw new Error(`Unsupported writing content type: ${contentType}`);
  }
  return profile;
}

export function mapContextPurposeToWritingType(
  purpose: ContentContextPurpose
): WritingContentType | null {
  const map: Partial<Record<ContentContextPurpose, WritingContentType>> = {
    SEO_ARTICLE: "SEO_ARTICLE",
    SEO_LANDING_PAGE: "LANDING_PAGE",
    PRODUCT_GUIDE: "PRODUCT_GUIDE",
    CASE_STUDY: "CASE_STUDY",
    KNOWLEDGE_ARTICLE: "KNOWLEDGE_ARTICLE",
  };
  return map[purpose] ?? null;
}
