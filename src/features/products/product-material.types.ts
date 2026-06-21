import type { MaterialType } from "@prisma/client";

export type ProductMaterialRecord = {
  id: string;
  productId: string;
  variantId: string | null;
  materialType: MaterialType;
  materialName: string;
  materialCode: string | null;
  unit: string;
  consumptionPerUnit: string;
  wastagePercent: string;
  note: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
