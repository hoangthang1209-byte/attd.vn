import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function searchKnowledgeBase(
  entries: KnowledgeBaseEntryRecord[],
  query: string
): KnowledgeBaseEntryRecord[] {
  const q = normalizeText(query);
  if (!q) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.summary ?? "",
      entry.content ?? "",
      entry.tags.join(" "),
      entry.category?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function groupKnowledgeByCategory(
  entries: KnowledgeBaseEntryRecord[]
): Map<string, KnowledgeBaseEntryRecord[]> {
  const groups = new Map<string, KnowledgeBaseEntryRecord[]>();
  for (const entry of entries) {
    const key = entry.category?.slug ?? entry.categoryId;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return groups;
}

export function filterKnowledgeByUsageScope(
  entries: KnowledgeBaseEntryRecord[],
  scope: string
): KnowledgeBaseEntryRecord[] {
  if (!scope) return entries;
  return entries.filter((entry) => entry.usageScope.includes(scope));
}

export function getRecommendedKnowledgeForKeyword(
  keyword: string,
  entries: KnowledgeBaseEntryRecord[]
): KnowledgeBaseEntryRecord[] {
  const q = normalizeText(keyword);
  if (!q) return entries.slice(0, 5);

  const scored = entries.map((entry) => {
    let score = 0;
    const title = normalizeText(entry.title);
    const summary = normalizeText(entry.summary ?? "");
    const content = normalizeText(entry.content ?? "").slice(0, 500);
    const tags = entry.tags.map(normalizeText).join(" ");

    if (title.includes(q) || q.includes(title)) score += 5;
    if (summary.includes(q)) score += 3;
    if (content.includes(q)) score += 2;
    if (tags.includes(q)) score += 2;
    if (entry.isVerified) score += 2;
    if (entry.status === "ACTIVE") score += 1;
    if (entry.isFeatured) score += 1;

    for (const word of q.split(/\s+/).filter((w) => w.length > 2)) {
      if (title.includes(word) || summary.includes(word) || tags.includes(word)) score += 1;
    }

    return { entry, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);
}

export function getRecommendedKnowledgeForBlueprint(
  blueprintId: string,
  entries: KnowledgeBaseEntryRecord[]
): KnowledgeBaseEntryRecord[] {
  const blueprintKeywords: Record<string, string[]> = {
    "source-supplier": ["nguồn hàng", "bán sỉ", "wholesale", "áo thun trơn"],
    oem: ["oem", "private label", "sản xuất", "in logo"],
    "dealer-recruitment": ["đại lý", "dealer", "chính sách"],
    "corporate-uniform": ["đồng phục", "uniform", "polo"],
    "corporate-gift": ["quà tặng", "corporate gift", "combo"],
  };

  const keywords = blueprintKeywords[blueprintId] ?? [];
  if (keywords.length === 0) return entries.slice(0, 5);

  const matched = entries.filter((entry) => {
    const text = normalizeText(
      [entry.title, entry.summary ?? "", entry.tags.join(" ")].join(" ")
    );
    return keywords.some((kw) => text.includes(normalizeText(kw)));
  });

  return matched.length > 0 ? matched : entries.slice(0, 5);
}
