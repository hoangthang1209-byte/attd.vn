-- Sprint 12.1 — Knowledge Graph governance relations (audit + review metadata)

ALTER TABLE "KnowledgeGraphRelationship"
  ADD COLUMN IF NOT EXISTS "reviewerId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewDueAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "KnowledgeGraphRelationship_sourceEntryId_idx"
  ON "KnowledgeGraphRelationship"("sourceEntryId");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphRelationship_evidenceUrl_idx"
  ON "KnowledgeGraphRelationship"("evidenceUrl");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphRelationship_updatedAt_idx"
  ON "KnowledgeGraphRelationship"("updatedAt");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphRelationship_reviewerId_status_idx"
  ON "KnowledgeGraphRelationship"("reviewerId", "status");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphRelationship_reviewDueAt_idx"
  ON "KnowledgeGraphRelationship"("reviewDueAt");

CREATE TABLE IF NOT EXISTS "KnowledgeGraphAuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "entityId" TEXT,
  "relationshipId" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "summary" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeGraphAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "KnowledgeGraphAuditLog_action_createdAt_idx"
  ON "KnowledgeGraphAuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphAuditLog_entityId_createdAt_idx"
  ON "KnowledgeGraphAuditLog"("entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphAuditLog_relationshipId_createdAt_idx"
  ON "KnowledgeGraphAuditLog"("relationshipId", "createdAt");
CREATE INDEX IF NOT EXISTS "KnowledgeGraphAuditLog_actorId_createdAt_idx"
  ON "KnowledgeGraphAuditLog"("actorId", "createdAt");
