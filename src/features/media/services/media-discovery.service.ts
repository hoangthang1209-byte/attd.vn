import type {
  MediaAssetType,
  MediaBundleContentType,
  MediaBundleSlotType,
  MediaCollectionType,
  MediaContentSuitability,
  MediaOrientation,
  MediaSeoReadinessStatus,
  MediaVisibility,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MEDIA_DISCOVERY_CANDIDATE_LIMIT,
  MEDIA_DISCOVERY_MAX_LIMIT,
} from "@/features/media/media-classification";
import { SLOT_DISCOVERY_PROFILES } from "@/features/media/media-bundle-presets";
import { calculateSuitabilityScore } from "@/features/media/services/media-content-intelligence.service";

export type MediaAssetWithClassification = Prisma.MediaAssetGetPayload<{
  include: {
    library: { select: { id: true; code: true; name: true; isActive: true } };
    role: { select: { id: true; code: true; name: true; isActive: true } };
    collections: {
      include: {
        mediaCollection: {
          select: {
            id: true;
            code: true;
            name: true;
            isActive: true;
            collectionType: true;
          };
        };
      };
    };
  };
}>;

export type MediaDiscoveryInput = {
  query?: string;
  libraries?: string[];
  roles?: string[];
  collections?: string[];
  collectionTypes?: MediaCollectionType[];
  keywords?: string[];
  tags?: string[];
  orientation?: MediaOrientation;
  visibility?: MediaVisibility;
  language?: string;
  limit?: number;
  excludeIds?: string[];
  assetTypes?: MediaAssetType[];
  subjects?: string[];
  materials?: string[];
  colors?: string[];
  techniques?: string[];
  industries?: string[];
  audiences?: string[];
  useCases?: string[];
  minimumSeoScore?: number;
  seoReadinessStatuses?: MediaSeoReadinessStatus[];
  contentSuitabilities?: MediaContentSuitability[];
  bundleContentType?: MediaBundleContentType;
  bundleSlotType?: MediaBundleSlotType;
  excludeBundleId?: string;
  excludeAssignedToBundle?: boolean;
  /** Soft-penalize assets already assigned elsewhere in this bundle. */
  penalizeBundleAssetIds?: string[];
};

export type MediaDiscoveryResult = {
  asset: MediaAssetWithClassification;
  score: number;
  matchedOn: string[];
};

const CANDIDATE_LIMIT = MEDIA_DISCOVERY_CANDIDATE_LIMIT;
const MAX_RESULT_LIMIT = MEDIA_DISCOVERY_MAX_LIMIT;

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return normalizePhrase(value)
    .split(/[\s,;/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function includesNormalized(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle) return false;
  return normalizePhrase(haystack).includes(needle);
}

function listIncludes(list: string[] | null | undefined, needle: string): boolean {
  if (!list?.length || !needle) return false;
  return list.some(
    (item) => normalizePhrase(item) === needle || normalizePhrase(item).includes(needle),
  );
}

function scoreSemanticList(
  terms: string[] | null | undefined,
  requested: string[],
  prefix: string,
  weight: number,
  matchedOn: string[],
  alreadyMatchedConcept: Set<string>,
): number {
  let score = 0;
  for (const raw of requested) {
    const needle = normalizePhrase(raw);
    if (!needle) continue;
    const conceptKey = `${prefix}:${needle}`;
    if (alreadyMatchedConcept.has(conceptKey)) continue;
    if (listIncludes(terms, needle)) {
      score += weight;
      matchedOn.push(`${prefix}:${raw}`);
      alreadyMatchedConcept.add(conceptKey);
    }
  }
  return score;
}

export function scoreAssetForDiscovery(
  asset: MediaAssetWithClassification,
  input: MediaDiscoveryInput,
): { score: number; matchedOn: string[] } {
  let score = 0;
  const matchedOn: string[] = [];
  const conceptKeys = new Set<string>();
  const query = input.query ? normalizePhrase(input.query) : "";
  const queryTokens = query ? tokenize(query) : [];
  const requestedLibraries = (input.libraries ?? []).map((c) => c.toUpperCase());
  const requestedRoles = (input.roles ?? []).map((c) => c.toUpperCase());
  const requestedCollections = (input.collections ?? []).map((c) => c.trim()).filter(Boolean);
  const requestedCollectionTypes = input.collectionTypes ?? [];
  const requestedKeywords = (input.keywords ?? []).map(normalizePhrase).filter(Boolean);
  const requestedTags = (input.tags ?? []).map(normalizePhrase).filter(Boolean);

  if (query) {
    if (includesNormalized(asset.title, query)) {
      score += 10;
      matchedOn.push(`title:${query}`);
    }
    if (includesNormalized(asset.altText, query)) {
      score += 8;
      matchedOn.push(`altText:${query}`);
    }
    if (includesNormalized(asset.caption, query)) {
      score += 4;
      matchedOn.push(`caption:${query}`);
    }
    if (includesNormalized(asset.description, query)) {
      score += 3;
      matchedOn.push(`description:${query}`);
    }
    if (includesNormalized(asset.filename, query) || includesNormalized(asset.originalName, query)) {
      score += 2;
      matchedOn.push(`filename:${query}`);
    }

    for (const token of queryTokens) {
      if (includesNormalized(asset.title, token) && !matchedOn.some((m) => m.startsWith("title:"))) {
        score += 3;
        matchedOn.push(`title:${token}`);
      }
      if (
        includesNormalized(asset.altText, token) &&
        !matchedOn.some((m) => m.startsWith("altText:"))
      ) {
        score += 2;
        matchedOn.push(`altText:${token}`);
      }
      if (listIncludes(asset.tags, token)) {
        score += 7;
        matchedOn.push(`tag:${token}`);
      }
      if (listIncludes(asset.keywords, token)) {
        score += 7;
        matchedOn.push(`keyword:${token}`);
      }
      if (listIncludes(asset.aiTags, token)) {
        score += 5;
        matchedOn.push(`aiTag:${token}`);
      }
      score += scoreSemanticList(asset.subjectTerms, [token], "subject", 8, matchedOn, conceptKeys);
      score += scoreSemanticList(asset.materialTerms, [token], "material", 5, matchedOn, conceptKeys);
      score += scoreSemanticList(asset.colorTerms, [token], "color", 4, matchedOn, conceptKeys);
      score += scoreSemanticList(
        asset.techniqueTerms,
        [token],
        "technique",
        6,
        matchedOn,
        conceptKeys,
      );
      score += scoreSemanticList(asset.industryTerms, [token], "industry", 6, matchedOn, conceptKeys);
      score += scoreSemanticList(asset.audienceTerms, [token], "audience", 4, matchedOn, conceptKeys);
      score += scoreSemanticList(asset.useCaseTerms, [token], "useCase", 7, matchedOn, conceptKeys);
    }
  }

  for (const tag of requestedTags) {
    if (listIncludes(asset.tags, tag)) {
      score += 7;
      matchedOn.push(`tag:${tag}`);
    }
  }

  for (const keyword of requestedKeywords) {
    if (listIncludes(asset.keywords, keyword) || listIncludes(asset.tags, keyword)) {
      score += 7;
      matchedOn.push(`keyword:${keyword}`);
    }
  }

  if (asset.library && requestedLibraries.includes(asset.library.code)) {
    score += 5;
    matchedOn.push(`library:${asset.library.code}`);
  }

  if (asset.role && requestedRoles.includes(asset.role.code)) {
    score += 5;
    matchedOn.push(`role:${asset.role.code}`);
  }

  if (requestedCollections.length && asset.collections?.length) {
    for (const join of asset.collections) {
      const code = join.mediaCollection.code;
      const id = join.mediaCollection.id;
      const matched =
        (code && requestedCollections.some((c) => c.toUpperCase() === code.toUpperCase())) ||
        requestedCollections.includes(id);
      if (matched) {
        score += 8;
        matchedOn.push(`collection:${code ?? id}`);
      }
    }
  }

  if (requestedCollectionTypes.length && asset.collections?.length) {
    for (const join of asset.collections) {
      const type = join.mediaCollection.collectionType;
      if (requestedCollectionTypes.includes(type)) {
        const key = `collectionType:${type}`;
        if (!conceptKeys.has(key)) {
          score += 4;
          matchedOn.push(key);
          conceptKeys.add(key);
        }
      }
    }
  }

  score += scoreSemanticList(
    asset.subjectTerms,
    input.subjects ?? [],
    "subject",
    8,
    matchedOn,
    conceptKeys,
  );
  score += scoreSemanticList(
    asset.materialTerms,
    input.materials ?? [],
    "material",
    5,
    matchedOn,
    conceptKeys,
  );
  score += scoreSemanticList(asset.colorTerms, input.colors ?? [], "color", 4, matchedOn, conceptKeys);
  score += scoreSemanticList(
    asset.techniqueTerms,
    input.techniques ?? [],
    "technique",
    6,
    matchedOn,
    conceptKeys,
  );
  score += scoreSemanticList(
    asset.industryTerms,
    input.industries ?? [],
    "industry",
    6,
    matchedOn,
    conceptKeys,
  );
  score += scoreSemanticList(
    asset.audienceTerms,
    input.audiences ?? [],
    "audience",
    4,
    matchedOn,
    conceptKeys,
  );
  score += scoreSemanticList(
    asset.useCaseTerms,
    input.useCases ?? [],
    "useCase",
    7,
    matchedOn,
    conceptKeys,
  );

  if (input.orientation && asset.orientation === input.orientation) {
    score += 3;
    matchedOn.push(`orientation:${asset.orientation}`);
  }

  if (asset.altText?.trim()) {
    score += 2;
    matchedOn.push("hasAltText");
  }

  if (asset.width && asset.height) {
    score += 1;
    matchedOn.push("hasDimensions");
  }

  if (asset.seoScore >= 85) {
    score += 4;
    matchedOn.push(`seoScore:${asset.seoScore}`);
  } else if (asset.seoScore >= 65) {
    score += 2;
    matchedOn.push(`seoScore:${asset.seoScore}`);
  }

  if (asset.seoReadinessStatus === "EXCELLENT") {
    score += 2;
    matchedOn.push("seoReadiness:EXCELLENT");
  }

  if (
    asset.duplicateStatus === "POSSIBLE_DUPLICATE" ||
    (asset.duplicateStatus === "CONFIRMED_DUPLICATE" && !asset.duplicateOfId)
  ) {
    score -= 2;
    matchedOn.push("duplicatePenalty");
  }

  const requestedSuitabilities =
    input.contentSuitabilities?.length
      ? input.contentSuitabilities
      : input.bundleSlotType
        ? SLOT_DISCOVERY_PROFILES[input.bundleSlotType]?.suitabilities ?? []
        : [];

  if (requestedSuitabilities.length) {
    const { score: suitScore, matched } = calculateSuitabilityScore(
      asset.contentSuitabilities,
      requestedSuitabilities,
    );
    if (suitScore > 0) {
      score += Math.min(suitScore, 10);
      for (const value of matched) matchedOn.push(`suitability:${value}`);
    }
  }

  if (input.bundleSlotType) {
    const profile = SLOT_DISCOVERY_PROFILES[input.bundleSlotType];
    if (profile?.roles?.length && asset.role && profile.roles.includes(asset.role.code)) {
      score += 6;
      matchedOn.push(`bundleSlot:${input.bundleSlotType}`);
      matchedOn.push(`role:${asset.role.code}`);
    } else if (input.bundleSlotType) {
      matchedOn.push(`bundleSlot:${input.bundleSlotType}`);
    }
    if (profile?.orientation && asset.orientation === profile.orientation) {
      score += 4;
      matchedOn.push(`orientation:${asset.orientation}`);
    }
  }

  if (input.bundleContentType) {
    score += 5;
    matchedOn.push(`bundleContentType:${input.bundleContentType}`);
  }

  if (input.penalizeBundleAssetIds?.includes(asset.id)) {
    score -= 3;
    matchedOn.push("bundleReusePenalty");
  }

  return { score, matchedOn: [...new Set(matchedOn)] };
}

/**
 * SEO/content media discovery.
 * Filters in DB, scores a bounded candidate set in application code.
 * Defaults: PUBLIC visibility, active library+role required.
 */
export async function discoverMediaAssets(
  input: MediaDiscoveryInput,
): Promise<MediaDiscoveryResult[]> {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), MAX_RESULT_LIMIT);
  const visibility = input.visibility ?? "PUBLIC";
  const excludeIds = [...new Set((input.excludeIds ?? []).filter(Boolean))];
  if (input.excludeBundleId && input.excludeAssignedToBundle !== false) {
    const assigned = await prisma.mediaBundleSlotAsset.findMany({
      where: { mediaBundleSlot: { mediaBundleId: input.excludeBundleId } },
      select: { mediaAssetId: true },
      take: 500,
    });
    for (const row of assigned) excludeIds.push(row.mediaAssetId);
  }
  const uniqueExcludeIds = [...new Set(excludeIds)];
  const libraryCodes = (input.libraries ?? []).map((c) => c.toUpperCase()).filter(Boolean);
  const roleCodes = (input.roles ?? []).map((c) => c.toUpperCase()).filter(Boolean);
  const collectionKeys = (input.collections ?? []).map((c) => c.trim()).filter(Boolean);
  const collectionTypes = input.collectionTypes ?? [];

  const slotProfile = input.bundleSlotType
    ? SLOT_DISCOVERY_PROFILES[input.bundleSlotType]
    : null;
  const mergedSuitabilities = [
    ...(input.contentSuitabilities ?? []),
    ...(slotProfile?.suitabilities ?? []),
  ];
  void mergedSuitabilities;
  const mergedRoles = [...new Set([...(input.roles ?? []), ...(slotProfile?.roles ?? [])])].map(
    (c) => c.toUpperCase(),
  );
  const mergedLibraries = [
    ...new Set([...(input.libraries ?? []), ...(slotProfile?.libraries ?? [])]),
  ].map((c) => c.toUpperCase());
  const effectiveOrientation = input.orientation ?? slotProfile?.orientation;
  const effectiveMinSeo =
    typeof input.minimumSeoScore === "number"
      ? input.minimumSeoScore
      : slotProfile?.minimumSeoScore;

  const arrayHasSome = (field: string, values?: string[]) =>
    values?.length ? { [field]: { hasSome: values } } : {};

  const collectionFilters: Prisma.MediaAssetWhereInput[] = [];
  if (collectionKeys.length) {
    collectionFilters.push({
      collections: {
        some: {
          OR: [
            { mediaCollection: { code: { in: collectionKeys.map((c) => c.toUpperCase()) } } },
            { mediaCollectionId: { in: collectionKeys } },
          ],
        },
      },
    });
  }
  if (collectionTypes.length) {
    collectionFilters.push({
      collections: {
        some: { mediaCollection: { collectionType: { in: collectionTypes } } },
      },
    });
  }

  const where: Prisma.MediaAssetWhereInput = {
    visibility,
    library: {
      isActive: true,
      ...((mergedLibraries.length ? mergedLibraries : libraryCodes).length
        ? { code: { in: mergedLibraries.length ? mergedLibraries : libraryCodes } }
        : {}),
    },
    role: {
      isActive: true,
      ...((mergedRoles.length ? mergedRoles : roleCodes).length
        ? { code: { in: mergedRoles.length ? mergedRoles : roleCodes } }
        : {}),
    },
    ...(collectionFilters.length ? { AND: collectionFilters } : {}),
    ...(effectiveOrientation ? { orientation: effectiveOrientation } : {}),
    ...(input.language ? { contentLanguage: input.language } : {}),
    ...(uniqueExcludeIds.length ? { id: { notIn: uniqueExcludeIds } } : {}),
    ...(input.assetTypes?.length ? { assetType: { in: input.assetTypes } } : {}),
    ...(typeof effectiveMinSeo === "number" ? { seoScore: { gte: effectiveMinSeo } } : {}),
    ...(input.seoReadinessStatuses?.length
      ? { seoReadinessStatus: { in: input.seoReadinessStatuses } }
      : {}),
    // Suitability is scored in-app; do not hard-filter DB (most assets still empty post-10.3).
    ...arrayHasSome("subjectTerms", input.subjects),
    ...arrayHasSome("materialTerms", input.materials),
    ...arrayHasSome("colorTerms", input.colors),
    ...arrayHasSome("techniqueTerms", input.techniques),
    ...arrayHasSome("industryTerms", input.industries),
    ...arrayHasSome("audienceTerms", input.audiences),
    ...arrayHasSome("useCaseTerms", input.useCases),
  };

  const candidates = await prisma.mediaAsset.findMany({
    where,
    include: {
      library: { select: { id: true, code: true, name: true, isActive: true } },
      role: { select: { id: true, code: true, name: true, isActive: true } },
      collections: {
        include: {
          mediaCollection: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
              collectionType: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: CANDIDATE_LIMIT,
  });

  const scored = candidates
    .map((asset) => {
      const { score, matchedOn } = scoreAssetForDiscovery(asset, input);
      return { asset, score, matchedOn };
    })
    .filter((item) => item.score > 0 || !input.query)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = a.asset.createdAt.getTime();
      const bTime = b.asset.createdAt.getTime();
      if (bTime !== aTime) return bTime - aTime;
      return a.asset.id.localeCompare(b.asset.id);
    });

  const seen = new Set<string>();
  const results: MediaDiscoveryResult[] = [];
  for (const item of scored) {
    if (seen.has(item.asset.id)) continue;
    seen.add(item.asset.id);
    results.push(item);
    if (results.length >= limit) break;
  }

  return results;
}

export { MEDIA_DISCOVERY_MAX_LIMIT };
