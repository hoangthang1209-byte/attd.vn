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

/** Tracking params stripped from substantive canonical decisions. */
export const TRACKING_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
]);

export type PartitionedSearchParams = {
  /** Non-tracking, non-empty substantive params in stable sort order. */
  meaningful: URLSearchParams;
  /** Input contained tracking params (even when substantive set is empty). */
  hadTrackingParams: boolean;
};

/** Build absolute URL using the shared site URL config. */
export function absoluteUrl(path: string): string {
  return canonicalUrl(path);
}

/**
 * True when raw input includes a tracking key, including empty values (`?utm_source=`).
 * Must run before normalization drops empty values.
 */
export function hasRawTrackingParameter(input: SearchParamInput): boolean {
  for (const [key, value] of Object.entries(input)) {
    if (!TRACKING_QUERY_KEYS.has(key.toLowerCase())) continue;
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) continue;
    return true;
  }
  return false;
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

/**
 * Split raw query input into substantive params vs tracking-only noise.
 * Empty substantive values (e.g. `?q=`, `?page=`) are ignored.
 */
export function partitionSearchParams(input: SearchParamInput): PartitionedSearchParams {
  const hadTrackingParams = hasRawTrackingParameter(input);
  const normalized = normalizeQuerySearchParams(input);
  const substantiveEntries: Array<[string, string]> = [];

  for (const [key, value] of normalized.entries()) {
    if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (!value.trim()) continue;
    substantiveEntries.push([key, value]);
  }

  substantiveEntries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  const meaningful = new URLSearchParams();
  for (const [key, val] of substantiveEntries) {
    meaningful.append(key, val);
  }

  return { meaningful, hadTrackingParams };
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

function hasSubstantiveQuery(meaningful: URLSearchParams): boolean {
  return meaningful.toString().length > 0;
}

function isCategoryOnlySubstantiveQuery(meaningful: URLSearchParams): boolean {
  const keys = [...new Set(meaningful.keys())];
  return keys.length === 1 && keys[0] === "category" && Boolean(meaningful.get("category")?.trim());
}

function buildCleanArchiveMetadata(
  basePath: string,
  partitioned: PartitionedSearchParams,
): Pick<Metadata, "alternates" | "robots"> {
  if (!hasSubstantiveQuery(partitioned.meaningful)) {
    return {
      ...buildCanonicalMetadata(basePath),
      robots: partitioned.hadTrackingParams ? ROBOTS_NOINDEX_FOLLOW : ROBOTS_INDEX_FOLLOW,
    };
  }

  return {
    ...buildCanonicalMetadata(basePath, partitioned.meaningful),
    robots: ROBOTS_NOINDEX_FOLLOW,
  };
}

/**
 * `/san-pham` catalog metadata policy.
 *
 * A. No substantive query → index, canonical `/san-pham` (tracking-only → noindex, clean canonical)
 * B. Category-only substantive query → noindex, canonical `/{slug}` when approved
 * C. Category + any other substantive param → noindex, self canonical
 * D. Any other substantive query (incl. unknown keys) → noindex, self canonical
 */
export function buildCatalogMetadata(searchParams: SearchParamInput): Metadata {
  const partitioned = partitionSearchParams(searchParams);

  if (!hasSubstantiveQuery(partitioned.meaningful)) {
    return buildCleanArchiveMetadata("/san-pham", partitioned);
  }

  if (isCategoryOnlySubstantiveQuery(partitioned.meaningful)) {
    const landingPath = resolveCatalogCategoryCanonicalPath(partitioned.meaningful.get("category"));
    const canonical = landingPath
      ? absoluteUrl(landingPath)
      : canonicalFromPath("/san-pham", partitioned.meaningful);

    return {
      alternates: { canonical },
      robots: ROBOTS_NOINDEX_FOLLOW,
    };
  }

  return {
    ...buildCanonicalMetadata("/san-pham", partitioned.meaningful),
    robots: ROBOTS_NOINDEX_FOLLOW,
  };
}

/** `/blog` archive metadata policy — any substantive query is noindex with self canonical. */
export function buildBlogIndexMetadata(searchParams: SearchParamInput): Metadata {
  return buildCleanArchiveMetadata("/blog", partitionSearchParams(searchParams));
}

/** `/blog/danh-muc/[slug]` archive metadata policy — any substantive query is noindex with self canonical. */
export function buildBlogCategoryMetadata(
  slug: string,
  searchParams: SearchParamInput,
): Pick<Metadata, "alternates" | "robots"> {
  return buildCleanArchiveMetadata(`/blog/danh-muc/${slug}`, partitionSearchParams(searchParams));
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

/** Company about page metadata overlay — canonical `/gioi-thieu`, indexable. */
export function buildAboutMetadata(base: Metadata = {}): Metadata {
  return {
    ...base,
    alternates: { canonical: absoluteUrl("/gioi-thieu") },
    robots: ROBOTS_INDEX_FOLLOW,
  };
}
