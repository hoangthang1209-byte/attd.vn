-- Phase 1B.1: Lead intake hub event log (additive only)
-- Issue #124

CREATE TYPE "LeadIntakeOutcome" AS ENUM ('CREATED', 'DUPLICATE', 'ERROR');

CREATE TABLE "LeadIntakeEvent" (
    "id" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "source" "LeadSource",
    "sourceRef" TEXT,
    "outcome" "LeadIntakeOutcome" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadIntakeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadIntakeEvent_adapterKey_createdAt_idx" ON "LeadIntakeEvent"("adapterKey", "createdAt");
CREATE INDEX "LeadIntakeEvent_outcome_createdAt_idx" ON "LeadIntakeEvent"("outcome", "createdAt");
