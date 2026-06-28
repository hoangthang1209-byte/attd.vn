import type { StorageFolderKey } from "@/lib/storage/types";
import type { MediaUsageType } from "@prisma/client";

export type MediaPickerLibraryView = "all" | "folder";
export const MEDIA_PICKER_DEFAULT_LIBRARY_VIEW: MediaPickerLibraryView = "all";

export const MEDIA_LIBRARY_PAGE_SIZE = 100;

export type MediaLibraryQuery = {
  search?: string;
  folder?: StorageFolderKey;
  usageType?: MediaUsageType;
  cursor?: string | null;
  paginated?: boolean;
  limit?: number;
};

export type ParsedMediaLibraryPage = {
  items: unknown[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number | null;
};

export function buildMediaLibraryApiUrl(query: MediaLibraryQuery = {}): string {
  const params = new URLSearchParams();
  if (query.paginated !== false) params.set("paginated", "1");
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.folder) params.set("folder", query.folder);
  if (query.usageType) params.set("usageType", query.usageType);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit && query.limit > 0) params.set("limit", String(query.limit));
  const qs = params.toString();
  return qs ? `/api/media?${qs}` : "/api/media?paginated=1";
}

export function parseMediaLibraryResponse(data: unknown): ParsedMediaLibraryPage {
  if (Array.isArray(data)) {
    return {
      items: data,
      nextCursor: null,
      hasMore: false,
      total: data.length,
    };
  }

  if (!data || typeof data !== "object") {
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }

  const record = data as Record<string, unknown>;
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.assets)
      ? record.assets
      : Array.isArray(record.data)
        ? record.data
        : [];

  const nextCursor =
    typeof record.nextCursor === "string" && record.nextCursor.trim()
      ? record.nextCursor
      : null;
  const hasMore = record.hasMore === true;
  const total =
    typeof record.total === "number" && Number.isFinite(record.total)
      ? record.total
      : null;

  return { items, nextCursor, hasMore, total };
}

export function mergeMediaLibraryPages(
  existing: unknown[],
  incoming: unknown[],
): unknown[] {
  const seen = new Set<string>();
  const merged: unknown[] = [];

  for (const item of [...existing, ...incoming]) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const key = String(raw.id ?? raw.url ?? raw.publicId ?? merged.length);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}
