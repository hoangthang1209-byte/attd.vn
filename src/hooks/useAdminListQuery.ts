"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useAdminListQuery<T>(key: string, url: string): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    const hasData = hasDataRef.current;
    if (hasData) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(url);
      const body = (await res.json()) as T & { message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? "Không thể tải dữ liệu.");
      }
      setData(body);
      hasDataRef.current = true;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [key, reload]);

  return { data, loading, refreshing, error, reload };
}
