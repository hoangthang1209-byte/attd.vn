import type {
  ManufacturingAssetStatus,
  ManufacturingMediaRole,
  ManufacturingVisibility,
} from "@prisma/client";
import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";

export type ManufacturingAssetVisibility = ManufacturingVisibility;
export type ManufacturingAssetPublishStatus = ManufacturingAssetStatus;
export type ManufacturingAssetMediaRole = ManufacturingMediaRole;

export type ManufacturingFrontendAsset = ManufacturingEvidenceItem & {
  slug: string;
  categoryName?: string;
  href?: string;
  featured: boolean;
  visibility: ManufacturingAssetVisibility;
  status: ManufacturingAssetPublishStatus;
  publishedAt?: string;
};

export type GetManufacturingAssetsForDisplayLocationInput = {
  locationKey: string;
  visibility?: ManufacturingAssetVisibility;
  limit?: number;
  requireMedia?: boolean;
};

export type GetManufacturingAssetsForTargetInput = {
  targetType: string;
  targetId: string;
  locationKey?: string;
  visibility?: ManufacturingAssetVisibility;
  limit?: number;
  requireMedia?: boolean;
};

export type ManufacturingWorkflowFrontendStep = {
  id: string;
  title: string;
  description?: string;
  stepKey?: string;
  sortOrder: number;
  estimatedDuration?: string;
  asset?: ManufacturingFrontendAsset;
};

export type ManufacturingWorkflowFrontend = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  steps: ManufacturingWorkflowFrontendStep[];
};

export type ManufacturingCategorySummary = {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
};

export type ManufacturingDisplayLocationSummary = {
  id: string;
  key: string;
  name: string;
  description?: string;
  sortOrder: number;
};
