"use client";

import { useEffect, useRef } from "react";
import { trackSearchEmptyResult } from "@/lib/analytics";

type Props = {
  query?: string | null;
  resultCount: number;
};

/** Fires search_empty_result once per query when catalog has zero matches. */
export default function CatalogSearchTracking({ query, resultCount }: Props) {
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const normalized = query?.trim() ?? "";
    if (!normalized || resultCount > 0) return;
    if (lastTrackedRef.current === normalized) return;
    lastTrackedRef.current = normalized;
    trackSearchEmptyResult(normalized, "catalog_page");
  }, [query, resultCount]);

  return null;
}
