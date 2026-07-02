"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialAvailabilityRow } from "@/features/materials/material-availability.service";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";

type MaterialsItemRow = {
  orderItemId: string;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  totalQuantity: number;
  materials: Array<{ id: string; materialType: string }>;
};

export type OrderWorkspaceData = {
  bundle: ProductionExecutionBundle | null;
  materialRows: MaterialAvailabilityRow[];
  itemMaterials: MaterialsItemRow[];
  productionFileCount: number;
  loading: boolean;
  refresh: () => void;
};

export function useOrderWorkspaceData(orderId: string): OrderWorkspaceData {
  const [bundle, setBundle] = useState<ProductionExecutionBundle | null>(null);
  const [materialRows, setMaterialRows] = useState<MaterialAvailabilityRow[]>([]);
  const [itemMaterials, setItemMaterials] = useState<MaterialsItemRow[]>([]);
  const [productionFileCount, setProductionFileCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void Promise.all([
      fetch(`/api/orders/${orderId}/production-execution`).then((r) => r.json()),
      fetch(`/api/orders/${orderId}/material-availability`).then((r) => r.json()),
      fetch(`/api/orders/${orderId}/materials`).then((r) => r.json()),
      fetch(`/api/orders/${orderId}/production-files`).then((r) => r.json()),
    ])
      .then(([execData, availData, materialsData, filesData]) => {
        if (cancelled) return;
        setBundle((execData.bundle as ProductionExecutionBundle | undefined) ?? null);
        setMaterialRows((availData.rows as MaterialAvailabilityRow[] | undefined) ?? []);
        setItemMaterials((materialsData.items as MaterialsItemRow[] | undefined) ?? []);
        const files = (filesData.files as unknown[] | undefined) ?? [];
        setProductionFileCount(files.length);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, refreshToken]);

  return { bundle, materialRows, itemMaterials, productionFileCount, loading, refresh };
}
