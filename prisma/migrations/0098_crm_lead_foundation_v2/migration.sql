ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'EMAIL';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'WHATSAPP';

-- CRM lead foundation v2 (additive / backward-compatible)

ALTER TABLE "Lead"
  ADD COLUMN "assignedEmployeeId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "assignmentSource" TEXT,
  ADD COLUMN "phoneNormalized" TEXT,
  ADD COLUMN "emailNormalized" TEXT,
  ADD COLUMN "lastInboundAt" TIMESTAMP(3);

CREATE TABLE "LeadInboundEvent" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "source" "LeadSource" NOT NULL,
  "channel" TEXT NOT NULL,
  "externalId" TEXT,
  "idempotencyKey" TEXT,
  "phoneNormalized" TEXT,
  "emailNormalized" TEXT,
  "payload" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadInboundEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadAssignmentHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fromEmployeeId" TEXT,
  "toEmployeeId" TEXT,
  "actorId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadInboundEvent_idempotencyKey_key"
  ON "LeadInboundEvent"("idempotencyKey");
CREATE UNIQUE INDEX "LeadInboundEvent_channel_externalId_key"
  ON "LeadInboundEvent"("channel", "externalId");

CREATE INDEX "Lead_phoneNormalized_idx" ON "Lead"("phoneNormalized");
CREATE INDEX "Lead_emailNormalized_idx" ON "Lead"("emailNormalized");
CREATE INDEX "Lead_assignedEmployeeId_idx" ON "Lead"("assignedEmployeeId");
CREATE INDEX "Lead_lastInboundAt_idx" ON "Lead"("lastInboundAt");
CREATE INDEX "LeadInboundEvent_leadId_receivedAt_idx"
  ON "LeadInboundEvent"("leadId", "receivedAt");
CREATE INDEX "LeadInboundEvent_phoneNormalized_idx"
  ON "LeadInboundEvent"("phoneNormalized");
CREATE INDEX "LeadInboundEvent_emailNormalized_idx"
  ON "LeadInboundEvent"("emailNormalized");
CREATE INDEX "LeadAssignmentHistory_leadId_createdAt_idx"
  ON "LeadAssignmentHistory"("leadId", "createdAt");
CREATE INDEX "LeadAssignmentHistory_toEmployeeId_idx"
  ON "LeadAssignmentHistory"("toEmployeeId");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedEmployeeId_fkey"
  FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadInboundEvent"
  ADD CONSTRAINT "LeadInboundEvent_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadAssignmentHistory"
  ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAssignmentHistory"
  ADD CONSTRAINT "LeadAssignmentHistory_fromEmployeeId_fkey"
  FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadAssignmentHistory"
  ADD CONSTRAINT "LeadAssignmentHistory_toEmployeeId_fkey"
  FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LeadTask" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "ownerId" TEXT,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "outcome" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadTask_leadId_completedAt_dueAt_idx"
  ON "LeadTask"("leadId", "completedAt", "dueAt");
CREATE INDEX "LeadTask_ownerId_completedAt_dueAt_idx"
  ON "LeadTask"("ownerId", "completedAt", "dueAt");

ALTER TABLE "LeadTask"
  ADD CONSTRAINT "LeadTask_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadTask"
  ADD CONSTRAINT "LeadTask_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "Employee"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LeadIdentityKey" (
  "key" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadIdentityKey_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "LeadIdentityKey_leadId_idx" ON "LeadIdentityKey"("leadId");
ALTER TABLE "LeadIdentityKey"
  ADD CONSTRAINT "LeadIdentityKey_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
