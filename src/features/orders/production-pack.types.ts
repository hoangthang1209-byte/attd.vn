import type { MaterialType, ProductionFileStatus, ProductionFileType } from "@prisma/client";

export type OrderProductionFileRecord = {
  id: string;
  orderId: string | null;
  orderItemId: string | null;
  mediaAssetId: string;
  type: ProductionFileType;
  status: ProductionFileStatus;
  version: number;
  title: string | null;
  note: string | null;
  appliesToColorId: string | null;
  appliesToColorName: string | null;
  appliesToSize: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  mediaAsset: {
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    format: string | null;
    sizeBytes: number;
    thumbnailUrl: string | null;
    storageProvider: string;
  };
};

export type OrderItemMaterialRecord = {
  id: string;
  orderItemId: string;
  sourceProductMaterialRequirementId: string | null;
  materialId: string | null;
  materialType: MaterialType;
  materialName: string;
  materialCode: string | null;
  materialCodeSnapshot: string | null;
  materialNameSnapshot: string | null;
  unitSnapshot: string | null;
  unit: string;
  consumptionPerUnit: string;
  wastagePercent: string;
  requiredQuantity: string;
  requiredQuantityOverridden: boolean;
  note: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
