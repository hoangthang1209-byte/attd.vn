import type { OperationsNamedView } from "@/features/content/operations/content-operations.types";

/**
 * Sprint 17.1 — named views over an inbox tab + `OperationsFilters`.
 *
 * Pure, client-agnostic helpers — no React, no fetch. Persistence is
 * best-effort localStorage; defaults are never written to storage and are
 * always present regardless of what the user has saved.
 */

export const OPERATIONS_NAMED_VIEWS_KEY = "attd.ops.namedViews";

export const DEFAULT_NAMED_VIEWS: OperationsNamedView[] = [
  {
    id: "default-todays-reviews",
    name: "Kiểm duyệt hôm nay",
    inbox: "review",
    filters: {},
    group: "waiting_today",
  },
  {
    id: "default-seo-refresh",
    name: "Làm mới SEO",
    inbox: "refresh",
    filters: {},
    group: null,
  },
  {
    id: "default-my-drafts",
    name: "Bản nháp của tôi",
    inbox: "kanban",
    filters: { pipelineColumn: "writing" },
    group: null,
  },
  {
    id: "default-publishing-today",
    name: "Xuất bản hôm nay",
    inbox: "publish",
    filters: {},
    group: "ready_today",
  },
];

const DEFAULT_VIEW_IDS = new Set(DEFAULT_NAMED_VIEWS.map((v) => v.id));

function getLocalStorage(): Storage | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function readCustomViews(): OperationsNamedView[] {
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(OPERATIONS_NAMED_VIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OperationsNamedView[]) : [];
  } catch {
    return [];
  }
}

function writeCustomViews(views: OperationsNamedView[]): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(OPERATIONS_NAMED_VIEWS_KEY, JSON.stringify(views));
  } catch {
    // Best-effort only — named views are a convenience, not governed state.
  }
}

/** Built-in defaults first, then the user's saved custom views. */
export function listNamedViews(): OperationsNamedView[] {
  return [...DEFAULT_NAMED_VIEWS, ...readCustomViews()];
}

/** Creates or updates a custom named view. Built-in defaults can never be overwritten. */
export function saveNamedView(view: Omit<OperationsNamedView, "id"> & { id?: string }): OperationsNamedView {
  const custom = readCustomViews();
  const id = view.id && !DEFAULT_VIEW_IDS.has(view.id) ? view.id : `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next: OperationsNamedView = {
    id,
    name: view.name,
    inbox: view.inbox,
    filters: view.filters,
    group: view.group ?? null,
  };
  const existingIndex = custom.findIndex((v) => v.id === id);
  const updated = existingIndex >= 0 ? custom.map((v, i) => (i === existingIndex ? next : v)) : [...custom, next];
  writeCustomViews(updated);
  return next;
}

/** No-op for built-in default views — only custom saved views can be removed. */
export function deleteNamedView(id: string): void {
  if (DEFAULT_VIEW_IDS.has(id)) return;
  writeCustomViews(readCustomViews().filter((v) => v.id !== id));
}
