/**
 * Editor preferences are pure UI memory (which panel was open, which blocks the
 * writer pinned). They never touch governed content, so localStorage is enough
 * and a missing/broken store must degrade to the default silently.
 */

const PREFIX = "attd.editor";

export const EDITOR_PREF_KEYS = {
  section: (key: string) => `${PREFIX}.section.${key}`,
  pinnedBlocks: `${PREFIX}.blocks.pinned`,
  recentBlocks: `${PREFIX}.blocks.recent`,
  previewDevice: `${PREFIX}.preview.device`,
} as const;

export const RECENT_BLOCK_LIMIT = 5;

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // Safari private mode and locked-down browsers throw on access.
    return null;
  }
}

export function readPref(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Preferences are best-effort; a full quota must never break the editor.
  }
}

export function readBoolPref(key: string): boolean | null {
  const raw = readPref(key);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

export function writeBoolPref(key: string, value: boolean): void {
  writePref(key, value ? "1" : "0");
}

export function readListPref(key: string): string[] {
  const raw = readPref(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeListPref(key: string, value: string[]): void {
  writePref(key, JSON.stringify(value));
}

/** Most-recent-first, de-duplicated, capped. */
export function pushRecent(list: string[], id: string, limit = RECENT_BLOCK_LIMIT): string[] {
  return [id, ...list.filter((item) => item !== id)].slice(0, limit);
}

export function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}
