-- Sprint 11.5 — Governed Content Review & Blog Handoff

CREATE TYPE "ContentReviewStatus" AS ENUM (
  'NOT_STARTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'SUPERSEDED'
);

CREATE TYPE "ContentReviewSectionStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
  'LOCKED'
);

CREATE TYPE "ContentReviewDecisionType" AS ENUM (
  'APPROVE_SECTION',
  'REQUEST_CHANGES',
  'REJECT_SECTION',
  'APPROVE_DRAFT',
  'REJECT_DRAFT',
  'REOPEN_DRAFT',
  'HANDOFF_TO_BLOG'
);

CREATE TYPE "ContentReviewIssueStatus" AS ENUM (
  'OPEN',
  'RESOLVED',
  'DISMISSED'
);

CREATE TYPE "ContentReviewSeverity" AS ENUM (
  'INFO',
  'WARNING',
  'ERROR',
  'BLOCKING'
);

CREATE TYPE "ContentHandoffStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'SUPERSEDED'
);

CREATE TYPE "ContentHandoffTargetType" AS ENUM (
  'BLOG_POST',
  'LANDING_PAGE',
  'CASE_STUDY',
  'OTHER'
);

ALTER TABLE "BlogPost"
  ADD COLUMN "sourceWritingDraftId" TEXT,
  ADD COLUMN "sourceWritingDraftVersion" INTEGER,
  ADD COLUMN "sourceReviewSessionId" TEXT,
  ADD COLUMN "sourceHandoffRecordId" TEXT,
  ADD COLUMN "contentModifiedAfterHandoff" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastHandoffAt" TIMESTAMP(3);

CREATE INDEX "BlogPost_sourceWritingDraftId_idx" ON "BlogPost"("sourceWritingDraftId");
CREATE INDEX "BlogPost_sourceHandoffRecordId_idx" ON "BlogPost"("sourceHandoffRecordId");

CREATE TABLE "ContentReviewSession" (
  "id" TEXT NOT NULL,
  "writingDraftId" TEXT NOT NULL,
  "writingDraftVersion" INTEGER NOT NULL,
  "writingPlanId" TEXT NOT NULL,
  "contextBuildId" TEXT NOT NULL,
  "status" "ContentReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "assignedReviewerId" TEXT,
  "startedBy" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "finalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentReviewSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentReviewSection" (
  "id" TEXT NOT NULL,
  "reviewSessionId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "status" "ContentReviewSectionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewerId" TEXT,
  "reviewerNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedContentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentReviewSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentReviewIssue" (
  "id" TEXT NOT NULL,
  "reviewSessionId" TEXT NOT NULL,
  "sectionId" TEXT,
  "code" TEXT NOT NULL,
  "severity" "ContentReviewSeverity" NOT NULL,
  "status" "ContentReviewIssueStatus" NOT NULL DEFAULT 'OPEN',
  "message" TEXT NOT NULL,
  "suggestedFix" TEXT,
  "source" TEXT NOT NULL,
  "metadata" JSONB,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentReviewIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentReviewDecision" (
  "id" TEXT NOT NULL,
  "reviewSessionId" TEXT NOT NULL,
  "decisionType" "ContentReviewDecisionType" NOT NULL,
  "sectionId" TEXT,
  "actorId" TEXT NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentHandoffRecord" (
  "id" TEXT NOT NULL,
  "writingDraftId" TEXT NOT NULL,
  "writingDraftVersion" INTEGER NOT NULL,
  "reviewSessionId" TEXT NOT NULL,
  "targetType" "ContentHandoffTargetType" NOT NULL,
  "targetEntityId" TEXT,
  "mode" TEXT NOT NULL,
  "status" "ContentHandoffStatus" NOT NULL DEFAULT 'PENDING',
  "fieldMapping" JSONB,
  "sourceSnapshotHash" TEXT NOT NULL,
  "resultSnapshot" JSONB,
  "requestedBy" TEXT,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentHandoffRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentReviewSession_writingDraftId_writingDraftVersion_idx" ON "ContentReviewSession"("writingDraftId", "writingDraftVersion");
CREATE INDEX "ContentReviewSession_status_createdAt_idx" ON "ContentReviewSession"("status", "createdAt");
CREATE INDEX "ContentReviewSession_assignedReviewerId_status_idx" ON "ContentReviewSession"("assignedReviewerId", "status");

CREATE UNIQUE INDEX "ContentReviewSection_reviewSessionId_sectionId_key" ON "ContentReviewSection"("reviewSessionId", "sectionId");
CREATE INDEX "ContentReviewSection_reviewSessionId_status_idx" ON "ContentReviewSection"("reviewSessionId", "status");

CREATE INDEX "ContentReviewIssue_reviewSessionId_status_idx" ON "ContentReviewIssue"("reviewSessionId", "status");
CREATE INDEX "ContentReviewIssue_sectionId_status_idx" ON "ContentReviewIssue"("sectionId", "status");

CREATE INDEX "ContentReviewDecision_reviewSessionId_createdAt_idx" ON "ContentReviewDecision"("reviewSessionId", "createdAt");
CREATE INDEX "ContentReviewDecision_actorId_createdAt_idx" ON "ContentReviewDecision"("actorId", "createdAt");

CREATE INDEX "ContentHandoffRecord_writingDraftId_writingDraftVersion_idx" ON "ContentHandoffRecord"("writingDraftId", "writingDraftVersion");
CREATE INDEX "ContentHandoffRecord_targetType_targetEntityId_idx" ON "ContentHandoffRecord"("targetType", "targetEntityId");
CREATE INDEX "ContentHandoffRecord_status_createdAt_idx" ON "ContentHandoffRecord"("status", "createdAt");
CREATE INDEX "ContentHandoffRecord_sourceSnapshotHash_idx" ON "ContentHandoffRecord"("sourceSnapshotHash");

ALTER TABLE "ContentReviewSection" ADD CONSTRAINT "ContentReviewSection_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ContentReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReviewIssue" ADD CONSTRAINT "ContentReviewIssue_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ContentReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReviewDecision" ADD CONSTRAINT "ContentReviewDecision_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ContentReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
