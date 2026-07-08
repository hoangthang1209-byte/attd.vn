"use client";

import ProductionMasterDetailManager from "@/components/admin/production-master/ProductionMasterDetailManager";
import ProductionMasterListManager from "@/components/admin/production-master/ProductionMasterListManager";
import {
  PRINT_METHOD_ADMIN,
  PRODUCTION_MATERIAL_ADMIN,
  PRODUCTION_SUPPLIER_ADMIN,
  PRODUCTION_TRIM_ADMIN,
  type MasterAdminConfig,
  type MasterEntityKind,
} from "@/components/admin/production-master/production-master-admin-config";

type ProductionMasterKind = MasterEntityKind;

const CONFIG_BY_KIND: Record<ProductionMasterKind, MasterAdminConfig> = {
  material: PRODUCTION_MATERIAL_ADMIN,
  trim: PRODUCTION_TRIM_ADMIN,
  supplier: PRODUCTION_SUPPLIER_ADMIN,
  "print-method": PRINT_METHOD_ADMIN,
};

type ListProps = {
  kind: ProductionMasterKind;
};

type DetailProps = ListProps & {
  itemId: string;
};

export function ProductionMasterListClient({ kind }: ListProps) {
  return <ProductionMasterListManager config={CONFIG_BY_KIND[kind]} />;
}

export function ProductionMasterDetailClient({ kind, itemId }: DetailProps) {
  return <ProductionMasterDetailManager config={CONFIG_BY_KIND[kind]} itemId={itemId} />;
}
