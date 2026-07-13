import type { MediaOrientation, MediaVisibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MEDIA_DISCOVERY_CANDIDATE_LIMIT,
  MEDIA_DISCOVERY_MAX_LIMIT,
} from "@/features/media/media-classification";

export type MediaAssetWithClassification = Prisma.MediaAssetGetPayload<{
  include: {
    library: { select: { id: true; code: true; name: true; isActive: true } };
    role: { select: { id: true; code: true; name: true; isActive: true } };
  };
}>;

export type MediaDiscoveryInput = {
  query?: string;
  libraries?: string[];
  roles?: string[];
  keywords?: string[];
  tags?: string[];
  orientation?: MediaOrientation;
  visibility?: MediaVisibility;
  language?: string;
  limit?: number;
  excludeIds?: string[];
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
  return list.some((item) => normalizePhrase(item) === needle || normalizePhrase(item).includes(needle));
}

function scoreAsset(
  asset: MediaAssetWithClassification,
  input: MediaDiscoveryInput,
): { score: number; matchedOn: string[] } {
  let score = 0;
  const matchedOn: string[] = [];
  const query = input.query ? normalizePhrase(input.query) : "";
  const queryTokens = query ? tokenize(query) : [];
  const requestedLibraries = (input.libraries ?? []).map((c) => c.toUpperCase());
  const requestedRoles = (input.roles ?? []).map((c) => c.toUpperCase());
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
      if (includesNormalized(asset.altText, token) && !matchedOn.some((m) => m.startsWith("altText:"))) {
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
  const libraryCodes = (input.libraries ?? []).map((c) => c.toUpperCase()).filter(Boolean);
  const roleCodes = (input.roles ?? []).map((c) => c.toUpperCase()).filter(Boolean);

  const where: Prisma.MediaAssetWhereInput = {
    visibility,
    library: { isActive: true, ...(libraryCodes.length ? { code: { in: libraryCodes } } : {}) },
    role: { isActive: true, ...(roleCodes.length ? { code: { in: roleCodes } } : {}) },
    ...(input.orientation ? { orientation: input.orientation } : {}),
    ...(input.language ? { contentLanguage: input.language } : {}),
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };

  const candidates = await prisma.mediaAsset.findMany({
    where,
    include: {
      library: { select: { id: true, code: true, name: true, isActive: true } },
      role: { select: { id: true, code: true, name: true, isActive: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: CANDIDATE_LIMIT,
  });

  const scored = candidates
    .map((asset) => {
      const { score, matchedOn } = scoreAsset(asset, input);
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
