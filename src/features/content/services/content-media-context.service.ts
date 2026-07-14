import "server-only";

import type { MediaBundleContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getMediaBundleForContent,
  type MediaBundleDetail,
} from "@/features/media/services/media-bundle.service";
import { planMediaContentCoverage } from "@/features/media/services/media-coverage.service";

export type ContentMediaContextInput = {
  contentType: MediaBundleContentType;
  query: string;
  bundleId?: string;
  subjects?: string[];
  industries?: string[];
  useCases?: string[];
  techniques?: string[];
  minimumSeoScore?: number;
};

export type ContentMediaContextResult = {
  query: string;
  contentType: MediaBundleContentType;
  bundle: MediaBundleDetail | null;
  plannedSlots: unknown;
  suggestedAssets: unknown;
  coverageGaps: unknown;
  readyToUse: {
    featuredUrl: string | null;
    ogUrl: string | null;
    inlineUrls: string[];
  };
};

/**
 * Server-side media context preparation for future SEO Writer.
 * No AI calls. No text generation.
 */
export async function prepareContentMediaContext(
  input: ContentMediaContextInput,
): Promise<ContentMediaContextResult> {
  const query = input.query.trim();
  const bundle = input.bundleId ? await getMediaBundleForContent(input.bundleId) : null;

  let plan: Awaited<ReturnType<typeof planMediaContentCoverage>> | null = null;
  try {
    plan = await planMediaContentCoverage({
      contentType: input.contentType,
      query,
      subjectTerms: input.subjects ?? [],
      industryTerms: input.industries ?? [],
      useCaseTerms: input.useCases ?? [],
      techniqueTerms: input.techniques ?? [],
      minimumSeoScore: input.minimumSeoScore,
    });
  } catch {
    plan = null;
  }

  const readyToUse = {
    featuredUrl: null as string | null,
    ogUrl: null as string | null,
    inlineUrls: [] as string[],
  };

  if (bundle) {
    for (const slot of bundle.slots) {
      for (const asset of slot.assets) {
        if (asset.visibility !== "PUBLIC") continue;
        if (slot.slotType === "FEATURED" || slot.slotType === "HERO") {
          readyToUse.featuredUrl ??= asset.url;
        } else if (slot.slotType === "OG_IMAGE") {
          readyToUse.ogUrl ??= asset.url;
        } else {
          readyToUse.inlineUrls.push(asset.url);
        }
      }
    }
  }

  return {
    query,
    contentType: input.contentType,
    bundle,
    plannedSlots: plan?.slots ?? null,
    suggestedAssets: plan?.slots?.flatMap((s) => s.sampleAssets) ?? null,
    coverageGaps: plan?.slots?.filter((s) => s.status === "MISSING" || s.status === "LOW") ?? null,
    readyToUse,
  };
}

/** Lightweight listing of selectable bundles for editors (active, non-archived). */
export async function listSelectableMediaBundles(params?: {
  contentType?: MediaBundleContentType;
  search?: string;
  take?: number;
}) {
  const take = Math.min(params?.take ?? 40, 100);
  return prisma.mediaBundle.findMany({
    where: {
      isActive: true,
      status: { not: "ARCHIVED" },
      ...(params?.contentType ? { contentType: params.contentType } : {}),
      ...(params?.search?.trim()
        ? { name: { contains: params.search.trim(), mode: "insensitive" } }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      contentType: true,
      isActive: true,
    },
  });
}
