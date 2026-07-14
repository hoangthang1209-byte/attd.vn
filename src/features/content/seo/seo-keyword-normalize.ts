/** Preserve Vietnamese accents; case-insensitive uniqueness via lowercase. */
export function normalizeSeoKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseBulkKeywordLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const kw of keywords) {
    const normalized = normalizeSeoKeyword(kw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(kw.trim().replace(/\s+/g, " "));
  }
  return out;
}
