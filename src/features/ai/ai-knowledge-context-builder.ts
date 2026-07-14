import { prisma } from "@/lib/prisma";
import {
  rankKnowledgeEntriesForQuery,
  type ContextPreviewInput,
} from "@/features/knowledge-base/knowledge-base-context-preview";
import type { KnowledgeVisibilityAudience } from "@/features/knowledge-base/knowledge-base-visibility";
import {
  calculateKnowledgeAiReadiness,
  type AiReadinessResult,
} from "@/features/knowledge-base/knowledge-base-ai-readiness";
import {
  getEntrySourceInfo,
} from "@/features/knowledge-base/knowledge-base-source-utils";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";

export type KnowledgeContextEntry = {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  category?: string;
  tags?: string[];
  usageScope?: string[];
  source?: {
    name?: string | null;
    url?: string | null;
    type?: string | null;
    note?: string | null;
  } | null;
  aiReadiness: AiReadinessResult;
  matchScore?: number;
  matchReasons?: string[];
  isVerified: boolean;
};

export type KnowledgeContextResult = {
  query: string;
  entries: KnowledgeContextEntry[];
  contextText: string;
  averageReadinessScore: number;
  warnings: string[];
};

const entryInclude = {
  category: { select: { id: true, name: true, slug: true } },
  source: { select: { id: true, name: true, url: true, type: true, note: true } },
} as const;

async function loadActiveEntries(): Promise<KnowledgeBaseEntryRecord[]> {
  const rows = await prisma.knowledgeBaseEntry.findMany({
    where: { status: { in: ["ACTIVE"] } },
    include: entryInclude,
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    take: 600,
  });
  return rows.map((entry) => ({
    ...entry,
    structuredData: (entry.structuredData as Record<string, unknown> | null) ?? null,
    verifiedAt: entry.verifiedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    category: entry.category,
    source: entry.source ?? null,
  })) as KnowledgeBaseEntryRecord[];
}

async function loadEntriesByIds(ids: string[]): Promise<KnowledgeBaseEntryRecord[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.knowledgeBaseEntry.findMany({
    where: { id: { in: ids }, status: { not: "ARCHIVED" } },
    include: entryInclude,
  });
  return rows.map((entry) => ({
    ...entry,
    structuredData: (entry.structuredData as Record<string, unknown> | null) ?? null,
    verifiedAt: entry.verifiedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    category: entry.category,
    source: entry.source ?? null,
  })) as KnowledgeBaseEntryRecord[];
}

function buildContextText(entries: KnowledgeContextEntry[]): string {
  if (entries.length === 0) return "";
  return entries
    .map((entry, i) => {
      const lines: string[] = [
        `[Dữ liệu Knowledge Base ${i + 1}]`,
        `Tiêu đề: ${entry.title}`,
      ];
      if (entry.category) lines.push(`Danh mục: ${entry.category}`);
      if (entry.tags?.length) lines.push(`Tags: ${entry.tags.join(", ")}`);
      lines.push(`Điểm sẵn sàng AI: ${entry.aiReadiness.score}/100 — ${entry.aiReadiness.label}`);
      if (entry.source?.name) {
        const sourceRef = entry.source.url
          ? `${entry.source.name} (${entry.source.url})`
          : entry.source.name;
        lines.push(`Nguồn tham khảo: ${sourceRef}`);
      }
      if (!entry.isVerified) lines.push("⚠ Chưa được kiểm chứng");
      lines.push("Nội dung:");
      const body = (entry.content || entry.summary || "").trim();
      lines.push(body.slice(0, 1200) + (body.length > 1200 ? "…" : ""));
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}

function buildWarnings(
  entries: KnowledgeContextEntry[],
  query: string,
  averageScore: number
): string[] {
  const warnings: string[] = [];

  if (entries.length === 0) {
    warnings.push(`Không tìm thấy dữ liệu Knowledge Base phù hợp với "${query}".`);
    return warnings;
  }

  if (averageScore < 40) {
    warnings.push("Điểm sẵn sàng AI trung bình thấp — nội dung có thể thiếu độ chính xác.");
  }

  const unverified = entries.filter((e) => !e.isVerified);
  if (unverified.length > 0) {
    warnings.push(
      `${unverified.length}/${entries.length} mục chưa được kiểm chứng.`
    );
  }

  const missingSources = entries.filter((e) => !e.source?.name && !e.source?.url);
  if (missingSources.length > 0) {
    warnings.push(
      `${missingSources.length}/${entries.length} mục thiếu nguồn tham khảo.`
    );
  }

  return warnings;
}

export async function buildKnowledgeContext(input: {
  query: string;
  usageScope?: string[];
  categoryIds?: string[];
  selectedEntryIds?: string[];
  audience?: KnowledgeVisibilityAudience;
  limit?: number;
  minReadinessScore?: number;
}): Promise<KnowledgeContextResult> {
  const limit = Math.min(10, Math.max(1, input.limit ?? 6));
  const minScore = input.minReadinessScore ?? 0;

  let baseEntries: KnowledgeBaseEntryRecord[];
  let matchScores = new Map<string, number>();
  let matchReasonsMap = new Map<string, string[]>();

  if (input.selectedEntryIds && input.selectedEntryIds.length > 0) {
    baseEntries = await loadEntriesByIds(input.selectedEntryIds);
  } else {
    const allActive = await loadActiveEntries();
    const previewInput: ContextPreviewInput = {
      query: input.query,
      usageScope: input.usageScope,
      categoryIds: input.categoryIds,
      audience: input.audience ?? "INTERNAL_AI",
      limit,
      includeArchived: false,
    };
    const ranked = rankKnowledgeEntriesForQuery(allActive, previewInput);
    baseEntries = ranked.results.map((r) => r.entry);
    for (const r of ranked.results) {
      matchScores.set(r.entry.id, r.score);
      matchReasonsMap.set(r.entry.id, r.matchReasons);
    }
  }

  const contextEntries: KnowledgeContextEntry[] = baseEntries
    .map((entry) => {
      const aiReadiness = calculateKnowledgeAiReadiness(entry);
      const sourceInfo = getEntrySourceInfo(entry);
      return {
        id: entry.id,
        title: entry.title,
        content: entry.content ?? "",
        summary: entry.summary,
        category: entry.category?.name,
        tags: entry.tags,
        usageScope: entry.usageScope,
        source: sourceInfo.name || sourceInfo.url
          ? {
              name: sourceInfo.name,
              url: sourceInfo.url,
              type: sourceInfo.type,
              note: sourceInfo.note,
            }
          : null,
        aiReadiness,
        matchScore: matchScores.get(entry.id),
        matchReasons: matchReasonsMap.get(entry.id),
        isVerified: entry.isVerified,
      };
    })
    .filter((e) => e.aiReadiness.score >= minScore)
    .slice(0, limit);

  const averageReadinessScore =
    contextEntries.length > 0
      ? Math.round(
          contextEntries.reduce((sum, e) => sum + e.aiReadiness.score, 0) /
            contextEntries.length
        )
      : 0;

  const contextText = buildContextText(contextEntries);
  const warnings = buildWarnings(contextEntries, input.query, averageReadinessScore);

  return {
    query: input.query,
    entries: contextEntries,
    contextText,
    averageReadinessScore,
    warnings,
  };
}
