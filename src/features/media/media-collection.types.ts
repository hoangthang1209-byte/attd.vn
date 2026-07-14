export type MediaCollectionRecord = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  assetCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaCollectionInput = {
  code?: string | null;
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateMediaCollectionInput = {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};
