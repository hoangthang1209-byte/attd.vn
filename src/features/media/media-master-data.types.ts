export type MediaMasterDataRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  assetCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaMasterDataInput = {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateMediaMasterDataInput = {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};
