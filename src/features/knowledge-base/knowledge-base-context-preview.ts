import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import {
  calculateKnowledgeAiReadiness,
  type AiReadinessResult,
} from "@/features/knowledge-base/knowledge-base-ai-readiness";
import { getEntrySourceInfo } from "@/features/knowledge-base/knowledge-base-source-utils";

export type ContextPreviewInput = {
  query: string;
  usageScope?: string[];
  categoryIds?: string[];
  limit?: number;
  includeArchived?: boolean;
};

export type ContextPreviewRankedResult = {
  entry: KnowledgeBaseEntryRecord;
  score: number;
  matchReasons: string[];
  aiReadiness: AiReadinessResult;
  sourceName: string | null;
  sourceUrl: string | null;
};

export type ContextPreviewSearchResult = {
  query: string;
  results: ContextPreviewRankedResult[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function rankKnowledgeEntriesForQuery(
  entries: KnowledgeBaseEntryRecord[],
  input: ContextPreviewInput
): ContextPreviewSearchResult {
  const query = input.query.trim();
  const limit = Math.min(20, Math.max(1, input.limit ?? 8));
  const tokens = tokenize(query);
  const normalizedQuery = normalizeText(query);

  let pool = entries.filter((entry) => {
    if (!input.includeArchived && entry.status === "ARCHIVED") return false;
    if (entry.status === "DRAFT") return false;
    if (input.categoryIds?.length && !input.categoryIds.includes(entry.categoryId)) return false;
    if (input.usageScope?.length) {
      const hasScope = input.usageScope.some((scope) => entry.usageScope.includes(scope));
      if (!hasScope) return false;
    }
    return true;
  });

  const ranked = pool
    .map((entry) => {
      let score = 0;
      const matchReasons: string[] = [];

      const title = normalizeText(entry.title);
      const summary = normalizeText(entry.summary ?? "");
      const content = normalizeText(entry.content ?? "").slice(0, 2000);
      const tags = entry.tags.map(normalizeText).join(" ");
      const category = normalizeText(entry.category?.name ?? "");

      if (normalizedQuery && title.includes(normalizedQuery)) {
        score += 25;
        matchReasons.push("Khớp tiêu đề");
      }
      if (normalizedQuery && summary.includes(normalizedQuery)) {
        score += 15;
        matchReasons.push("Khớp tóm tắt");
      }
      if (normalizedQuery && content.includes(normalizedQuery)) {
        score += 12;
        matchReasons.push("Khớp nội dung");
      }

      for (const token of tokens) {
        if (title.includes(token)) {
          score += 8;
          if (!matchReasons.includes("Khớp tiêu đề")) matchReasons.push("Khớp từ khóa trong tiêu đề");
        }
        if (summary.includes(token)) score += 4;
        if (content.includes(token)) score += 3;
        if (tags.includes(token)) {
          score += 6;
          matchReasons.push("Khớp tags");
        }
        if (category.includes(token)) {
          score += 5;
          matchReasons.push("Khớp danh mục");
        }
      }

      if (input.usageScope?.length) {
        const matchedScopes = input.usageScope.filter((s) => entry.usageScope.includes(s));
        if (matchedScopes.length > 0) {
          score += matchedScopes.length * 4;
          matchReasons.push("Khớp mục đích sử dụng");
        }
      }

      if (entry.isVerified) {
        score += 10;
        matchReasons.push("Đã kiểm chứng");
      }

      if (entry.priority === "HIGH") score += 5;
      if (entry.status === "ACTIVE") score += 3;

      const aiReadiness = calculateKnowledgeAiReadiness(entry);
      score += Math.round(aiReadiness.score / 10);

      const source = getEntrySourceInfo(entry);

      return {
        entry,
        score,
        matchReasons: [...new Set(matchReasons)],
        aiReadiness,
        sourceName: source.name,
        sourceUrl: source.url,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { query, results: ranked };
}
