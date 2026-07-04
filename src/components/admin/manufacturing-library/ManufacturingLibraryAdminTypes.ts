export type MlCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  parent?: { name: string } | null;
  _count?: { assets?: number; children?: number };
};

export type MlDisplayLocation = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  _count?: { assets?: number };
};

export type MlWorkflowStep = {
  id?: string;
  assetId: string | null;
  title: string;
  description: string | null;
  stepKey: string | null;
  sortOrder: number;
  estimatedDuration: string | null;
  metadata?: unknown;
};

export type MlWorkflow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  metadata: unknown;
  steps?: MlWorkflowStep[];
  _count?: { assets?: number };
};

export type MlMediaAsset = {
  id: string;
  filename: string;
  title: string | null;
  url: string;
  mimeType: string;
};

export type MlProductLookup = {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
};

export type MlProductCategoryLookup = {
  id: string;
  name: string;
  slug: string;
};

export type MlLookups = {
  categories: MlCategory[];
  displayLocations: MlDisplayLocation[];
  workflows: MlWorkflow[];
  mediaAssets: MlMediaAsset[];
  products: MlProductLookup[];
  productCategories: MlProductCategoryLookup[];
  relationTargetTypes: readonly string[];
};

export type MlAsset = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  status: string;
  visibility: string;
  priority: number;
  featured: boolean;
  publishedAt: string | Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  aiSummary: string | null;
  aiKeywords: unknown;
  metadata: unknown;
  updatedAt: string | Date;
  category?: MlCategory | null;
  media: Array<{
    id: string;
    mediaAssetId: string;
    role: string;
    caption: string | null;
    altText: string | null;
    sortOrder: number;
    mediaAsset: MlMediaAsset;
  }>;
  displayLocations: Array<{
    displayLocationId: string;
    sortOrder: number;
    displayLocation: MlDisplayLocation;
  }>;
  tags: Array<{ tag: { name: string; slug: string; description: string | null } }>;
  relations: Array<{
    id: string;
    targetType: string;
    targetId: string;
    role: string | null;
    sortOrder: number;
  }>;
  workflows: Array<{
    workflowId: string;
    role: string | null;
    sortOrder: number;
    workflow: MlWorkflow;
  }>;
};
