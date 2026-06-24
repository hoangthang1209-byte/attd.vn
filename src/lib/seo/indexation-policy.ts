import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import {
  isIndexableCategoryLanding,
  resolveCatalogCategoryCanonicalPath,
} from "@/lib/seo/indexable-category-routes";

export type SearchParamInput = Record<string, string | string[] | undefined>;

export const X_ROBOTS_TAG_NOINDEX_NOFOLLOW = "noindex, nofollow";

export const ROBOTS_INDEX_FOLLOW = { index: true, follow: true } as const;
export const ROBOTS_NOINDEX_FOLLOW = { index: false, follow: true } as const;
export const ROBOTS_NOINDEX_NOFOLLOW = { index: false, follow: false } as const;

const CATALOG_QUERY_KEYS = new Set([
  "category",
  "q",
  "search",
  "material",
  "inStock",
  "print",
  "embroidery",
  "oem",
  "sort",
  "page",
]);

const BLOG_INDEX_QUERY_KEYS = new Set(["page", "tag", "q", "search"]);

/** Build absolute URL using the shared site URL config. */
export function absoluteUrl(path: string): string {
  return canonicalUrl(path);
}

/** Normalize search params for stable canonical URLs (sorted keys). */
export function normalizeQuerySearchParams(input: SearchParamInput): URLSearchParams {
  const entries: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const raw of values) {
      const trimmed = String(raw).trim();
      if (!trimmed) continue;
      entries.push([key, trimmed]);
    }
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  const params = new URLSearchParams();
  for (const [key, val] of entries) {
    params.append(key, val);
  }
  return params;
}

function canonicalFromPath(path: string, params?: URLSearchParams): string {
  const qs = params?.toString();
  return absoluteUrl(qs ? `${path}?${qs}` : path);
}

export function buildCanonicalMetadata(path: string, params?: URLSearchParams): Pick<Metadata, "alternates"> {
  return {
    alternates: {
      canonical: canonicalFromPath(path, params),
    },
  };
}

export function buildRobotsMetadata(
  robots: typeof ROBOTS_INDEX_FOLLOW | typeof ROBOTS_NOINDEX_FOLLOW | typeof ROBOTS_NOINDEX_NOFOLLOW,
): Pick<Metadata, "robots"> {
  return { robots };
}

export function buildNoindexFollowMetadata(): Pick<Metadata, "robots"> {
  return buildRobotsMetadata(ROBOTS_NOINDEX_FOLLOW);
}

export function buildPrivateNoindexMetadata(): Pick<Metadata, "robots"> {
  return buildRobotsMetadata(ROBOTS_NOINDEX_NOFOLLOW);
}

export function mergePdfNoindexHeaders(headers: Record<string, string>): Record<string, string> {
  return {
    ...headers,
    "X-Robots-Tag": X_ROBOTS_TAG_NOINDEX_NOFOLLOW,
  };
}

function paramsHasMeaningfulKeys(params: URLSearchParams, keys: Set<string>): boolean {
  for (const key of params.keys()) {
    if (keys.has(key)) return true;
  }
  return false;
}

/** `/san-pham` catalog metadata policy. */
export function buildCatalogMetadata(searchParams: SearchParamInput): Metadata {
  const normalized = normalizeQuerySearchParams(searchParams);

  if (!paramsHasMeaningfulKeys(normalized, CATALOG_QUERY_KEYS)) {
    return {
      ...buildCanonicalMetadata("/san-pham"),
      robots: ROBOTS_INDEX_FOLLOW,
    };
  }

  const categorySlug = normalized.get("category");
  const landingPath = resolveCatalogCategoryCanonicalPath(categorySlug);
  const canonical = landingPath
    ? absoluteUrl(landingPath)
    : canonicalFromPath("/san-pham", normalized);

  return {
    alternates: { canonical },
    robots: ROBOTS_NOINDEX_FOLLOW,
  };
}

/** `/blog` archive metadata policy. */
export function buildBlogIndexMetadata(searchParams: SearchParamInput): Metadata {
  const normalized = normalizeQuerySearchParams(searchParams);

  if (!paramsHasMeaningfulKeys(normalized, BLOG_INDEX_QUERY_KEYS)) {
    return {
      ...buildCanonicalMetadata("/blog"),
      robots: ROBOTS_INDEX_FOLLOW,
    };
  }

  return {
    ...buildCanonicalMetadata("/blog", normalized),
    robots: ROBOTS_NOINDEX_FOLLOW,
  };
}

/** `/blog/danh-muc/[slug]` archive metadata policy. */
export function buildBlogCategoryMetadata(
  slug: string,
  searchParams: SearchParamInput,
): Pick<Metadata, "alternates" | "robots"> {
  const normalized = normalizeQuerySearchParams(searchParams);
  const basePath = `/blog/danh-muc/${slug}`;
  const page = Math.max(1, parseInt(normalized.get("page") ?? "1", 10) || 1);
  const hasArchiveFilters = Boolean(
    normalized.get("tag")?.trim() ||
      normalized.get("q")?.trim() ||
      normalized.get("search")?.trim(),
  );

  const isIndexable = page === 1 && !hasArchiveFilters;

  if (isIndexable) {
    return {
      ...buildCanonicalMetadata(basePath),
      robots: ROBOTS_INDEX_FOLLOW,
    };
  }

  return {
    ...buildCanonicalMetadata(basePath, normalized),
    robots: ROBOTS_NOINDEX_FOLLOW,
  };
}

/** `/{category}` landing metadata indexation overlay. */
export function applyCategoryLandingIndexation(
  slug: string,
): Pick<Metadata, "alternates" | "robots"> {
  const path = `/${slug.trim()}`;
  const canonical = absoluteUrl(path);

  if (isIndexableCategoryLanding(slug)) {
    return {
      alternates: { canonical },
      robots: ROBOTS_INDEX_FOLLOW,
    };
  }

  return {
    alternates: { canonical },
    robots: ROBOTS_NOINDEX_FOLLOW,
  };
}

/** Homepage metadata overlay — canonical `/`, indexable. */
export function buildHomepageMetadata(base: Metadata = {}): Metadata {
  return {
    ...base,
    alternates: { canonical: absoluteUrl("/") },
    robots: ROBOTS_INDEX_FOLLOW,
  };
}

/** Contact page metadata overlay — canonical `/lien-he`, indexable. */
export function buildContactMetadata(base: Metadata = {}): Metadata {
  return {
    ...base,
    alternates: { canonical: absoluteUrl("/lien-he") },
    robots: ROBOTS_INDEX_FOLLOW,
  };
}
