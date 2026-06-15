-- Sprint 24.8.3 — Knowledge Base Bulk Import

CREATE TABLE "KnowledgeBaseImportJob" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeBaseImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeBaseImportJob_createdAt_idx" ON "KnowledgeBaseImportJob"("createdAt");
