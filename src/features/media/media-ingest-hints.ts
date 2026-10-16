/**
 * Folder/bulk upload relative paths are hints only — never authoritative labels.
 */
export function normalizeIngestRelativePath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\\/g, "/").trim();
  if (!trimmed) return null;
  const segments = trimmed
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!segments.length) return null;
  return segments.join("/");
}

export function ingestHintTokensFromRelativePath(relativePath: string | null | undefined): string[] {
  const normalized = normalizeIngestRelativePath(relativePath);
  if (!normalized) return [];
  const base = normalized.split("/").pop() ?? normalized;
  const withoutExt = base.replace(/\.[a-z0-9]+$/i, "");
  const tokens = [
    ...normalized.split("/"),
    withoutExt,
    withoutExt.replace(/[_-]+/g, " "),
  ]
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return [...new Set(tokens)].slice(0, 12);
}
