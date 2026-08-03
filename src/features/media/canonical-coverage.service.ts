/**
 * Canonical vs legacy media reference coverage (Sprint 14.7).
 * Exact counts only — no fuzzy matching.
 */

import { prisma } from "@/lib/prisma";

export type ModuleMediaCoverage = {
  total: number;
  withMedia: number;
  canonical: number;
  legacyOnly: number;
  missing: number;
  migrationPercent: number;
};

export type CanonicalMediaCoverageReport = {
  category: ModuleMediaCoverage;
  caseStudy: ModuleMediaCoverage;
  product: ModuleMediaCoverage;
  overallMigrationPercent: number;
  brokenUrlCount: number;
  mediaAssetMissingCount: number;
};

function pct(canonical: number, withMedia: number): number {
  if (withMedia <= 0) return 100;
  return Math.round((canonical / withMedia) * 1000) / 10;
}

function moduleCoverage(input: {
  total: number;
  withMedia: number;
  canonical: number;
}): ModuleMediaCoverage {
  const legacyOnly = Math.max(0, input.withMedia - input.canonical);
  const missing = Math.max(0, input.total - input.withMedia);
  return {
    total: input.total,
    withMedia: input.withMedia,
    canonical: input.canonical,
    legacyOnly,
    missing,
    migrationPercent: pct(input.canonical, input.withMedia),
  };
}

export async function getCanonicalMediaCoverage(): Promise<CanonicalMediaCoverageReport> {
  const [
    categoryTotal,
    categoryWithMedia,
    categoryCanonical,
    caseStudyTotal,
    caseStudyWithMedia,
    caseStudyCanonical,
    productTotal,
    productWithFeatured,
    productDescriptionWithMediaId,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.category.count({
      where: {
        OR: [
          { AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: "" } }] },
          { mediaAssetId: { not: null } },
        ],
      },
    }),
    prisma.category.count({ where: { mediaAssetId: { not: null } } }),
    prisma.caseStudyRecord.count(),
    prisma.caseStudyRecord.count({
      where: {
        OR: [{ NOT: { imageUrl: "" } }, { mediaAssetId: { not: null } }],
      },
    }),
    prisma.caseStudyRecord.count({ where: { mediaAssetId: { not: null } } }),
    prisma.product.count(),
    prisma.product.count({
      where: {
        OR: [
          { AND: [{ featuredImage: { not: null } }, { NOT: { featuredImage: "" } }] },
          { NOT: { gallery: { equals: [] } } },
        ],
      },
    }),
    // Foundation signal only: description blocks already use mediaId.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Product" p
      WHERE p."descriptionBlocks" IS NOT NULL
        AND p."descriptionBlocks"::text LIKE '%"mediaId":"c%'
    `.catch(() => [{ count: BigInt(0) }]),
  ]);

  const productCanonical = Number(productDescriptionWithMediaId[0]?.count ?? 0);
  const category = moduleCoverage({
    total: categoryTotal,
    withMedia: categoryWithMedia,
    canonical: categoryCanonical,
  });
  const caseStudy = moduleCoverage({
    total: caseStudyTotal,
    withMedia: caseStudyWithMedia,
    canonical: caseStudyCanonical,
  });
  // Featured/gallery remain URL-primary; descriptionBlocks mediaId is the only Product canonical signal.
  const product = moduleCoverage({
    total: productTotal,
    withMedia: productWithFeatured,
    canonical: Math.min(productCanonical, productWithFeatured),
  });

  const withMediaSum = category.withMedia + caseStudy.withMedia + product.withMedia;
  const canonicalSum = category.canonical + caseStudy.canonical + product.canonical;

  const [brokenCategory, brokenCaseStudy] = await Promise.all([
    prisma.category.count({
      where: {
        mediaAssetId: null,
        imageUrl: { startsWith: "javascript:" },
      },
    }),
    prisma.caseStudyRecord.count({
      where: {
        mediaAssetId: null,
        imageUrl: { startsWith: "javascript:" },
      },
    }),
  ]);

  return {
    category,
    caseStudy,
    product,
    overallMigrationPercent: pct(canonicalSum, withMediaSum),
    brokenUrlCount: brokenCategory + brokenCaseStudy,
    // FK constraints prevent dangling mediaAssetId rows.
    mediaAssetMissingCount: 0,
  };
}

/** Exact-URL backfill report (read-only diagnostics). */
export async function getExactUrlBackfillReport(): Promise<{
  category: { matched: number; ambiguous: number; unmatched: number };
  caseStudy: { matched: number; ambiguous: number; unmatched: number };
}> {
  const [catMatched, csMatched] = await Promise.all([
    prisma.category.count({ where: { mediaAssetId: { not: null } } }),
    prisma.caseStudyRecord.count({ where: { mediaAssetId: { not: null } } }),
  ]);

  // Ambiguous / unmatched require raw SQL over URL multiplicity
  type Row = { kind: string; cnt: bigint };
  const rows = await prisma.$queryRaw<Row[]>`
    WITH cat AS (
      SELECT c.id,
        COUNT(DISTINCT m.id) AS match_count
      FROM "Category" c
      LEFT JOIN "MediaAsset" m
        ON c."imageUrl" IS NOT NULL AND c."imageUrl" <> ''
        AND (m.url = c."imageUrl" OR m."thumbnailUrl" = c."imageUrl")
      WHERE c."mediaAssetId" IS NULL
        AND c."imageUrl" IS NOT NULL AND c."imageUrl" <> ''
      GROUP BY c.id
    ),
    cs AS (
      SELECT c.id,
        COUNT(DISTINCT m.id) AS match_count
      FROM "CaseStudyRecord" c
      LEFT JOIN "MediaAsset" m
        ON c."imageUrl" IS NOT NULL AND c."imageUrl" <> ''
        AND (m.url = c."imageUrl" OR m."thumbnailUrl" = c."imageUrl")
      WHERE c."mediaAssetId" IS NULL
        AND c."imageUrl" IS NOT NULL AND c."imageUrl" <> ''
      GROUP BY c.id
    )
    SELECT 'cat_ambiguous' AS kind, COUNT(*)::bigint AS cnt FROM cat WHERE match_count > 1
    UNION ALL
    SELECT 'cat_unmatched', COUNT(*)::bigint FROM cat WHERE match_count = 0
    UNION ALL
    SELECT 'cs_ambiguous', COUNT(*)::bigint FROM cs WHERE match_count > 1
    UNION ALL
    SELECT 'cs_unmatched', COUNT(*)::bigint FROM cs WHERE match_count = 0
  `.catch(() => [] as Row[]);

  const map = Object.fromEntries(rows.map((r) => [r.kind, Number(r.cnt)]));

  return {
    category: {
      matched: catMatched,
      ambiguous: map.cat_ambiguous ?? 0,
      unmatched: map.cat_unmatched ?? 0,
    },
    caseStudy: {
      matched: csMatched,
      ambiguous: map.cs_ambiguous ?? 0,
      unmatched: map.cs_unmatched ?? 0,
    },
  };
}
