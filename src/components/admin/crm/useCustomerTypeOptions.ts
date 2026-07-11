"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerTypeRecord } from "@/features/crm/customer-type-types";

export function useCustomerTypeOptions(activeOnly = true) {
  const [types, setTypes] = useState<CustomerTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeOnly) params.set("activeOnly", "1");
      const res = await fetch(`/api/crm/customer-types?${params}`);
      const data = (await res.json()) as { types?: CustomerTypeRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải loại khách hàng.");
      setTypes(data.types ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải loại khách hàng.");
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  return { types, loading, error, reload: load };
}
