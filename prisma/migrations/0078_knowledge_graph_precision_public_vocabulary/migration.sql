-- Sprint 12.3: vocabulary visibility governance for public-safe graph paths
ALTER TABLE "MediaVocabularyTerm"
  ADD COLUMN IF NOT EXISTS "visibility" "KnowledgeBaseVisibility" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS "publicSafeReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicSafeReviewedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "publicSafeReason" TEXT;

CREATE INDEX IF NOT EXISTS "MediaVocabularyTerm_visibility_type_idx"
  ON "MediaVocabularyTerm"("visibility", "type");
