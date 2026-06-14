import type { FaqItem } from "@/components/seo/FaqSchema";
import type { CollectionContent } from "@/lib/collectionContent";
import type { WholesaleContent } from "@/lib/wholesaleContent";
import type {
  BespokeLandingDefaults,
  LandingPageFaqItem,
  LandingPageRecord,
  ResolvedBespokeLanding,
} from "@/features/landing-pages/types";

export function parseFaqJson(value: unknown): LandingPageFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question =
        typeof row.question === "string"
          ? row.question.trim()
          : typeof row.q === "string"
            ? row.q.trim()
            : "";
      const answer =
        typeof row.answer === "string"
          ? row.answer.trim()
          : typeof row.a === "string"
            ? row.a.trim()
            : "";
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is FaqItem => item != null);
}

function cmsField(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function cmsOptionalCta(
  label: string | null | undefined,
  href: string | null | undefined
): { label: string; href: string } | undefined {
  const l = label?.trim();
  const h = href?.trim();
  if (!l || !h) return undefined;
  return { label: l, href: h };
}

export function mergeWholesaleContent(
  staticContent: WholesaleContent,
  cms: LandingPageRecord | null
): WholesaleContent {
  if (!cms?.isPublished) return staticContent;

  const faq = parseFaqJson(cms.faqJson);
  return {
    ...staticContent,
    seoTitle: cmsField(cms.metaTitle, staticContent.seoTitle),
    metaDescription: cmsField(cms.metaDescription, staticContent.metaDescription),
    h1: cmsField(cms.heroTitle, staticContent.h1),
    heroIntro: cmsField(cms.heroDescription, staticContent.heroIntro),
    intro: cmsField(cms.seoContent, staticContent.intro),
    faq: faq.length > 0 ? faq : staticContent.faq,
    ctaTitle: cmsField(cms.primaryCtaLabel, staticContent.ctaTitle),
    ctaDescription: cmsField(cms.secondaryCtaLabel, staticContent.ctaDescription),
    primaryCta:
      cmsOptionalCta(cms.primaryCtaLabel, cms.primaryCtaHref) ?? staticContent.primaryCta,
    secondaryCta:
      cmsOptionalCta(cms.secondaryCtaLabel, cms.secondaryCtaHref) ??
      staticContent.secondaryCta,
  };
}

export function mergeCollectionContent(
  staticContent: CollectionContent | null,
  cms: LandingPageRecord | null
): CollectionContent | null {
  if (!staticContent) return null;
  if (!cms?.isPublished) return staticContent;

  const faq = parseFaqJson(cms.faqJson);
  return {
    ...staticContent,
    seoTitle: cmsField(cms.metaTitle, staticContent.seoTitle),
    metaDescription: cmsField(cms.metaDescription, staticContent.metaDescription),
    displayName: cmsField(cms.heroTitle, staticContent.displayName ?? ""),
    shortIntro: cmsField(cms.heroDescription, staticContent.shortIntro),
    intro: cmsField(cms.seoContent, staticContent.intro),
    faq: faq.length > 0 ? faq : staticContent.faq,
    ctaTitle: cmsField(cms.primaryCtaLabel, staticContent.ctaTitle),
    ctaDescription: cmsField(cms.secondaryCtaLabel, staticContent.ctaDescription),
    primaryCta:
      cmsOptionalCta(cms.primaryCtaLabel, cms.primaryCtaHref) ?? staticContent.primaryCta,
    secondaryCta:
      cmsOptionalCta(cms.secondaryCtaLabel, cms.secondaryCtaHref) ??
      staticContent.secondaryCta,
  };
}

export function mergeBespokeLanding(
  defaults: BespokeLandingDefaults,
  cms: LandingPageRecord | null
): ResolvedBespokeLanding {
  if (!cms?.isPublished) return defaults;

  const faq = parseFaqJson(cms.faqJson);
  return {
    title: cmsField(cms.title, defaults.title),
    metaTitle: cmsField(cms.metaTitle, defaults.metaTitle),
    metaDescription: cmsField(cms.metaDescription, defaults.metaDescription),
    heroTitle: cmsField(cms.heroTitle, defaults.heroTitle),
    heroDescription: cmsField(cms.heroDescription, defaults.heroDescription),
    seoContent: cmsField(cms.seoContent, defaults.seoContent),
    faq: faq.length > 0 ? faq : defaults.faq,
    primaryCtaLabel: cmsField(cms.primaryCtaLabel, defaults.primaryCtaLabel),
    primaryCtaHref: cmsField(cms.primaryCtaHref, defaults.primaryCtaHref),
    secondaryCtaLabel: cmsField(cms.secondaryCtaLabel, defaults.secondaryCtaLabel),
    secondaryCtaHref: cmsField(cms.secondaryCtaHref, defaults.secondaryCtaHref),
  };
}
