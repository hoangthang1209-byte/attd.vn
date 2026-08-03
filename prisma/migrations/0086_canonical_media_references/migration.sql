-- Sprint 14.7: Canonical MediaAsset references for Category + Case Study
-- Dual-read: mediaAssetId is canonical; imageUrl remains compatibility mirror.
-- Exact URL backfill only (no fuzzy / filename / AI matching).

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "mediaAssetId" TEXT;
ALTER TABLE "CaseStudyRecord" ADD COLUMN IF NOT EXISTS "mediaAssetId" TEXT;

CREATE INDEX IF NOT EXISTS "Category_mediaAssetId_idx" ON "Category"("mediaAssetId");
CREATE INDEX IF NOT EXISTS "CaseStudyRecord_mediaAssetId_idx" ON "CaseStudyRecord"("mediaAssetId");

ALTER TABLE "Category"
  DROP CONSTRAINT IF EXISTS "Category_mediaAssetId_fkey";
ALTER TABLE "Category"
  ADD CONSTRAINT "Category_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseStudyRecord"
  DROP CONSTRAINT IF EXISTS "CaseStudyRecord_mediaAssetId_fkey";
ALTER TABLE "CaseStudyRecord"
  ADD CONSTRAINT "CaseStudyRecord_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Exact URL match backfill for Category (unique match only).
UPDATE "Category" AS c
SET "mediaAssetId" = matched.asset_id
FROM (
  SELECT c2.id AS category_id, (array_agg(m.id ORDER BY m.id))[1] AS asset_id
  FROM "Category" c2
  INNER JOIN "MediaAsset" m
    ON m.url = c2."imageUrl"
    OR (c2."imageUrl" IS NOT NULL AND m."thumbnailUrl" = c2."imageUrl")
  WHERE c2."imageUrl" IS NOT NULL
    AND c2."imageUrl" <> ''
    AND c2."mediaAssetId" IS NULL
  GROUP BY c2.id
  HAVING COUNT(DISTINCT m.id) = 1
) AS matched
WHERE c.id = matched.category_id;

-- Exact URL match backfill for CaseStudyRecord (unique match only).
UPDATE "CaseStudyRecord" AS cs
SET "mediaAssetId" = matched.asset_id
FROM (
  SELECT cs2.id AS case_study_id, (array_agg(m.id ORDER BY m.id))[1] AS asset_id
  FROM "CaseStudyRecord" cs2
  INNER JOIN "MediaAsset" m
    ON m.url = cs2."imageUrl"
    OR (cs2."imageUrl" IS NOT NULL AND m."thumbnailUrl" = cs2."imageUrl")
  WHERE cs2."imageUrl" IS NOT NULL
    AND cs2."imageUrl" <> ''
    AND cs2."mediaAssetId" IS NULL
  GROUP BY cs2.id
  HAVING COUNT(DISTINCT m.id) = 1
) AS matched
WHERE cs.id = matched.case_study_id;
