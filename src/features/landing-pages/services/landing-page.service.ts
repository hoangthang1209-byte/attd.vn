import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCollectionContent } from "@/lib/collectionContent";
import { getWholesaleContent } from "@/lib/wholesaleContent";
import { CTA } from "@/lib/ctaConfig";
import { BESPOKE_LANDING_DEFAULTS } from "@/features/landing-pages/bespoke-defaults";
import { parseFaqJson } from "@/features/landing-pages/landing-page-merge";
import {
  LANDING_PAGE_SLUGS,
  type LandingPageInput,
  type LandingPageRecord,
  type LandingPageSlug,
} from "@/features/landing-pages/types";

function toPrismaFaqJson(faq: LandingPageInput["faqJson"] | undefined): Prisma.InputJsonValue {
  return (faq ?? []) as unknown as Prisma.InputJsonValue;
}

function mapRow(row: {
  id: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  seoContent: string;
  faqJson: unknown;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}): LandingPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    heroTitle: row.heroTitle,
    heroDescription: row.heroDescription,
    seoContent: row.seoContent,
    faqJson: parseFaqJson(row.faqJson),
    primaryCtaLabel: row.primaryCtaLabel,
    primaryCtaHref: row.primaryCtaHref,
    secondaryCtaLabel: row.secondaryCtaLabel,
    secondaryCtaHref: row.secondaryCtaHref,
    isPublished: row.isPublished,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function isLandingPageTableReady(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'LandingPageContent'
      ) AS "exists"
    `;
    return rows[0]?.exists === true;
  } catch {
    return false;
  }
}

export async function listLandingPages(): Promise<LandingPageRecord[]> {
  try {
    if (!(await isLandingPageTableReady())) return [];
    const rows = await prisma.landingPageContent.findMany({
      orderBy: [{ slug: "asc" }],
    });
    return rows.map(mapRow);
  } catch {
    return [];
  }
}

export async function getLandingPageBySlug(
  slug: string
): Promise<LandingPageRecord | null> {
  try {
    if (!(await isLandingPageTableReady())) return null;
    const row = await prisma.landingPageContent.findUnique({ where: { slug } });
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

export async function getPublishedLandingPage(
  slug: string
): Promise<LandingPageRecord | null> {
  const row = await getLandingPageBySlug(slug);
  if (!row?.isPublished) return null;
  return row;
}

export async function upsertLandingPage(
  slug: string,
  data: Partial<Omit<LandingPageInput, "slug">>
): Promise<LandingPageRecord | null> {
  try {
    if (!(await isLandingPageTableReady())) return null;

    const row = await prisma.landingPageContent.upsert({
      where: { slug },
      create: {
        slug,
        title: data.title ?? slug,
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
        heroTitle: data.heroTitle ?? "",
        heroDescription: data.heroDescription ?? "",
        seoContent: data.seoContent ?? "",
        faqJson: toPrismaFaqJson(data.faqJson),
        primaryCtaLabel: data.primaryCtaLabel ?? "",
        primaryCtaHref: data.primaryCtaHref ?? "",
        secondaryCtaLabel: data.secondaryCtaLabel ?? "",
        secondaryCtaHref: data.secondaryCtaHref ?? "",
        isPublished: data.isPublished ?? true,
      },
      update: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.metaTitle !== undefined ? { metaTitle: data.metaTitle } : {}),
        ...(data.metaDescription !== undefined
          ? { metaDescription: data.metaDescription }
          : {}),
        ...(data.heroTitle !== undefined ? { heroTitle: data.heroTitle } : {}),
        ...(data.heroDescription !== undefined
          ? { heroDescription: data.heroDescription }
          : {}),
        ...(data.seoContent !== undefined ? { seoContent: data.seoContent } : {}),
        ...(data.faqJson !== undefined ? { faqJson: toPrismaFaqJson(data.faqJson) } : {}),
        ...(data.primaryCtaLabel !== undefined
          ? { primaryCtaLabel: data.primaryCtaLabel }
          : {}),
        ...(data.primaryCtaHref !== undefined
          ? { primaryCtaHref: data.primaryCtaHref }
          : {}),
        ...(data.secondaryCtaLabel !== undefined
          ? { secondaryCtaLabel: data.secondaryCtaLabel }
          : {}),
        ...(data.secondaryCtaHref !== undefined
          ? { secondaryCtaHref: data.secondaryCtaHref }
          : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
    });

    return mapRow(row);
  } catch (err) {
    console.error("[landing-page.service] upsertLandingPage failed:", err);
    return null;
  }
}

function buildSeedInput(slug: LandingPageSlug): LandingPageInput | null {
  const collection = getCollectionContent(slug);
  if (collection) {
    return {
      slug,
      title: collection.displayName ?? collection.seoTitle,
      metaTitle: collection.seoTitle,
      metaDescription: collection.metaDescription,
      heroTitle: collection.displayName ?? collection.seoTitle,
      heroDescription: collection.shortIntro,
      seoContent: collection.intro,
      faqJson: collection.faq,
      primaryCtaLabel: collection.ctaTitle,
      primaryCtaHref: CTA.primary.href,
      secondaryCtaLabel: collection.ctaDescription,
      secondaryCtaHref: CTA.secondary.href,
      isPublished: true,
    };
  }

  const wholesale = getWholesaleContent(slug);
  if (wholesale) {
    return {
      slug,
      title: wholesale.h1,
      metaTitle: wholesale.seoTitle,
      metaDescription: wholesale.metaDescription,
      heroTitle: wholesale.h1,
      heroDescription: wholesale.heroIntro,
      seoContent: wholesale.intro,
      faqJson: wholesale.faq,
      primaryCtaLabel: wholesale.ctaTitle,
      primaryCtaHref: CTA.primary.href,
      secondaryCtaLabel: wholesale.ctaDescription,
      secondaryCtaHref: CTA.secondary.href,
      isPublished: true,
    };
  }

  const bespoke = BESPOKE_LANDING_DEFAULTS[slug as keyof typeof BESPOKE_LANDING_DEFAULTS];
  if (bespoke) {
    return {
      slug,
      title: bespoke.title,
      metaTitle: bespoke.metaTitle,
      metaDescription: bespoke.metaDescription,
      heroTitle: bespoke.heroTitle,
      heroDescription: bespoke.heroDescription,
      seoContent: bespoke.seoContent,
      faqJson: bespoke.faq,
      primaryCtaLabel: bespoke.primaryCtaLabel,
      primaryCtaHref: bespoke.primaryCtaHref,
      secondaryCtaLabel: bespoke.secondaryCtaLabel,
      secondaryCtaHref: bespoke.secondaryCtaHref,
      isPublished: true,
    };
  }

  return null;
}

export async function seedLandingPages(): Promise<number> {
  if (!(await isLandingPageTableReady())) return 0;

  let seeded = 0;
  for (const slug of LANDING_PAGE_SLUGS) {
    const existing = await prisma.landingPageContent.findUnique({ where: { slug } });
    if (existing) continue;

    const input = buildSeedInput(slug);
    if (!input) continue;

    await prisma.landingPageContent.create({
      data: {
        ...input,
        faqJson: toPrismaFaqJson(input.faqJson),
      },
    });
    seeded += 1;
  }

  return seeded;
}

export async function ensureLandingPagesSeeded(): Promise<void> {
  try {
    await seedLandingPages();
  } catch (err) {
    console.error("[landing-page.service] seedLandingPages failed:", err);
  }
}

export function landingPageRoute(slug: string): string {
  return `/${slug}`;
}
