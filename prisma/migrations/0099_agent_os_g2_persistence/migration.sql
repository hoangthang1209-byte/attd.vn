-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_EXTERNAL', 'WAITING_HUMAN', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentEventSource" AS ENUM ('GITHUB_ISSUE_STATUS', 'GITHUB_PR', 'CI_RESULT', 'REVIEWER_RESULT', 'VERCEL_DEPLOYMENT', 'MANUAL_OWNER');

-- CreateEnum
CREATE TYPE "AgentDecisionType" AS ENUM ('ROUTE', 'ESCALATE', 'APPROVE_BUILD', 'BLOCK', 'RETRY', 'COMPLETE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgentOperationalRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerSource" "AgentEventSource" NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "githubIssueNumber" INTEGER,
    "correlationId" TEXT,
    "parentRunId" TEXT,
    "idempotencyKey" TEXT,
    "inputSummary" JSONB,
    "outputSummary" JSONB,
    "blockerReason" TEXT,
    "nextAction" TEXT,
    "humanApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "humanApprovalReceivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRun" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "githubIssueNumber" INTEGER,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "taskArea" TEXT,
    "inputSummary" JSONB,
    "outputSummary" JSONB,
    "blockerReason" TEXT,
    "nextAction" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "taskRunId" TEXT,
    "source" "AgentEventSource" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadSummary" JSONB,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "decisionType" "AgentDecisionType" NOT NULL,
    "rationaleSummary" TEXT NOT NULL,
    "riskLevel" "AgentOperationalRiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "humanApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "humanApprovalReceivedAt" TIMESTAMP(3),
    "selectedAction" TEXT,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentRun_idempotencyKey_key" ON "AgentRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_status_idx" ON "AgentRun"("agentId", "status");

-- CreateIndex
CREATE INDEX "AgentRun_githubIssueNumber_attemptNumber_idx" ON "AgentRun"("githubIssueNumber", "attemptNumber");

-- CreateIndex
CREATE INDEX "AgentRun_correlationId_idx" ON "AgentRun"("correlationId");

-- CreateIndex
CREATE INDEX "AgentRun_status_updatedAt_idx" ON "AgentRun"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "TaskRun_agentRunId_idx" ON "TaskRun"("agentRunId");

-- CreateIndex
CREATE INDEX "TaskRun_githubIssueNumber_idx" ON "TaskRun"("githubIssueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEvent_agentRunId_idempotencyKey_key" ON "AgentEvent"("agentRunId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentEvent_agentRunId_appliedAt_idx" ON "AgentEvent"("agentRunId", "appliedAt");

-- CreateIndex
CREATE INDEX "AgentEvent_source_idx" ON "AgentEvent"("source");

-- CreateIndex
CREATE INDEX "AgentDecision_agentRunId_createdAt_idx" ON "AgentDecision"("agentRunId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRun" ADD CONSTRAINT "TaskRun_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_taskRunId_fkey" FOREIGN KEY ("taskRunId") REFERENCES "TaskRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
