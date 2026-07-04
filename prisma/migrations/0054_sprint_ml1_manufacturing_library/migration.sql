-- Sprint ML1 — Manufacturing Library data foundation

CREATE TYPE "ManufacturingAssetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ManufacturingVisibility" AS ENUM ('PUBLIC', 'DEALER_ONLY', 'CUSTOMER_ONLY', 'INTERNAL');
CREATE TYPE "ManufacturingMediaRole" AS ENUM ('THUMBNAIL', 'HERO', 'EVIDENCE', 'GALLERY', 'PROCESS', 'TIMELINE', 'VIDEO', 'DOCUMENT', 'PDF');

CREATE TABLE "ManufacturingCategory" (
  "id" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingAsset" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" TEXT,
  "status" "ManufacturingAssetStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "ManufacturingVisibility" NOT NULL DEFAULT 'INTERNAL',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "aiSummary" TEXT,
  "aiKeywords" JSONB,
  "embedding" JSONB,
  "metadata" JSONB,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingDisplayLocation" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingDisplayLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingAssetDisplayLocation" (
  "assetId" TEXT NOT NULL,
  "displayLocationId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ManufacturingAssetDisplayLocation_pkey" PRIMARY KEY ("assetId","displayLocationId")
);

CREATE TABLE "ManufacturingMedia" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "role" "ManufacturingMediaRole" NOT NULL DEFAULT 'GALLERY',
  "caption" TEXT,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingAssetTag" (
  "assetId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ManufacturingAssetTag_pkey" PRIMARY KEY ("assetId","tagId")
);

CREATE TABLE "ManufacturingRelation" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "role" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingWorkflowTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingWorkflowTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingWorkflowStep" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "assetId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "stepKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "estimatedDuration" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManufacturingWorkflowStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingAssetWorkflow" (
  "assetId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "role" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ManufacturingAssetWorkflow_pkey" PRIMARY KEY ("assetId","workflowId")
);

CREATE UNIQUE INDEX "ManufacturingCategory_slug_key" ON "ManufacturingCategory"("slug");
CREATE INDEX "ManufacturingCategory_parentId_idx" ON "ManufacturingCategory"("parentId");
CREATE INDEX "ManufacturingCategory_active_idx" ON "ManufacturingCategory"("active");
CREATE INDEX "ManufacturingCategory_sortOrder_idx" ON "ManufacturingCategory"("sortOrder");
CREATE INDEX "ManufacturingCategory_slug_idx" ON "ManufacturingCategory"("slug");

CREATE UNIQUE INDEX "ManufacturingAsset_slug_key" ON "ManufacturingAsset"("slug");
CREATE INDEX "ManufacturingAsset_categoryId_idx" ON "ManufacturingAsset"("categoryId");
CREATE INDEX "ManufacturingAsset_status_idx" ON "ManufacturingAsset"("status");
CREATE INDEX "ManufacturingAsset_visibility_idx" ON "ManufacturingAsset"("visibility");
CREATE INDEX "ManufacturingAsset_featured_idx" ON "ManufacturingAsset"("featured");
CREATE INDEX "ManufacturingAsset_priority_idx" ON "ManufacturingAsset"("priority");
CREATE INDEX "ManufacturingAsset_publishedAt_idx" ON "ManufacturingAsset"("publishedAt");
CREATE INDEX "ManufacturingAsset_slug_idx" ON "ManufacturingAsset"("slug");

CREATE UNIQUE INDEX "ManufacturingDisplayLocation_key_key" ON "ManufacturingDisplayLocation"("key");
CREATE INDEX "ManufacturingDisplayLocation_key_idx" ON "ManufacturingDisplayLocation"("key");
CREATE INDEX "ManufacturingDisplayLocation_active_idx" ON "ManufacturingDisplayLocation"("active");
CREATE INDEX "ManufacturingDisplayLocation_sortOrder_idx" ON "ManufacturingDisplayLocation"("sortOrder");

CREATE INDEX "ManufacturingAssetDisplayLocation_displayLocationId_idx" ON "ManufacturingAssetDisplayLocation"("displayLocationId");
CREATE INDEX "ManufacturingAssetDisplayLocation_sortOrder_idx" ON "ManufacturingAssetDisplayLocation"("sortOrder");

CREATE INDEX "ManufacturingMedia_assetId_idx" ON "ManufacturingMedia"("assetId");
CREATE INDEX "ManufacturingMedia_mediaAssetId_idx" ON "ManufacturingMedia"("mediaAssetId");
CREATE INDEX "ManufacturingMedia_role_idx" ON "ManufacturingMedia"("role");
CREATE INDEX "ManufacturingMedia_sortOrder_idx" ON "ManufacturingMedia"("sortOrder");

CREATE UNIQUE INDEX "ManufacturingTag_slug_key" ON "ManufacturingTag"("slug");
CREATE INDEX "ManufacturingTag_slug_idx" ON "ManufacturingTag"("slug");

CREATE INDEX "ManufacturingAssetTag_tagId_idx" ON "ManufacturingAssetTag"("tagId");

CREATE INDEX "ManufacturingRelation_assetId_idx" ON "ManufacturingRelation"("assetId");
CREATE INDEX "ManufacturingRelation_targetType_idx" ON "ManufacturingRelation"("targetType");
CREATE INDEX "ManufacturingRelation_targetId_idx" ON "ManufacturingRelation"("targetId");
CREATE INDEX "ManufacturingRelation_targetType_targetId_idx" ON "ManufacturingRelation"("targetType", "targetId");
CREATE INDEX "ManufacturingRelation_role_idx" ON "ManufacturingRelation"("role");
CREATE INDEX "ManufacturingRelation_sortOrder_idx" ON "ManufacturingRelation"("sortOrder");

CREATE UNIQUE INDEX "ManufacturingWorkflowTemplate_slug_key" ON "ManufacturingWorkflowTemplate"("slug");
CREATE INDEX "ManufacturingWorkflowTemplate_slug_idx" ON "ManufacturingWorkflowTemplate"("slug");
CREATE INDEX "ManufacturingWorkflowTemplate_active_idx" ON "ManufacturingWorkflowTemplate"("active");
CREATE INDEX "ManufacturingWorkflowTemplate_sortOrder_idx" ON "ManufacturingWorkflowTemplate"("sortOrder");

CREATE INDEX "ManufacturingWorkflowStep_workflowId_idx" ON "ManufacturingWorkflowStep"("workflowId");
CREATE INDEX "ManufacturingWorkflowStep_assetId_idx" ON "ManufacturingWorkflowStep"("assetId");
CREATE INDEX "ManufacturingWorkflowStep_stepKey_idx" ON "ManufacturingWorkflowStep"("stepKey");
CREATE INDEX "ManufacturingWorkflowStep_sortOrder_idx" ON "ManufacturingWorkflowStep"("sortOrder");

CREATE INDEX "ManufacturingAssetWorkflow_workflowId_idx" ON "ManufacturingAssetWorkflow"("workflowId");
CREATE INDEX "ManufacturingAssetWorkflow_role_idx" ON "ManufacturingAssetWorkflow"("role");
CREATE INDEX "ManufacturingAssetWorkflow_sortOrder_idx" ON "ManufacturingAssetWorkflow"("sortOrder");

ALTER TABLE "ManufacturingCategory" ADD CONSTRAINT "ManufacturingCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ManufacturingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAsset" ADD CONSTRAINT "ManufacturingAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ManufacturingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAssetDisplayLocation" ADD CONSTRAINT "ManufacturingAssetDisplayLocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManufacturingAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAssetDisplayLocation" ADD CONSTRAINT "ManufacturingAssetDisplayLocation_displayLocationId_fkey" FOREIGN KEY ("displayLocationId") REFERENCES "ManufacturingDisplayLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingMedia" ADD CONSTRAINT "ManufacturingMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManufacturingAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingMedia" ADD CONSTRAINT "ManufacturingMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAssetTag" ADD CONSTRAINT "ManufacturingAssetTag_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManufacturingAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAssetTag" ADD CONSTRAINT "ManufacturingAssetTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ManufacturingTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingRelation" ADD CONSTRAINT "ManufacturingRelation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManufacturingAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingWorkflowStep" ADD CONSTRAINT "ManufacturingWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ManufacturingWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingWorkflowStep" ADD CONSTRAINT "ManufacturingWorkflowStep_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManufacturingAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAssetWorkflow" ADD CONSTRAINT "ManufacturingAssetWorkflow_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ManufacturingAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingAssetWorkflow" ADD CONSTRAINT "ManufacturingAssetWorkflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ManufacturingWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
