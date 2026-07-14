import "server-only";

import type { SeoKeywordType, SeoSearchIntent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  dedupeKeywords,
  normalizeSeoKeyword,
  parseBulkKeywordLines,
} from "@/features/content/seo/seo-keyword-normalize";

export async function addSeoKeywords(input: {
  topicId: string;
  keywords: Array<{
    keyword: string;
    keywordType: SeoKeywordType;
    searchIntent?: SeoSearchIntent | null;
    source?: string | null;
    searchVolume?: number | null;
    keywordDifficulty?: number | null;
    cpc?: number | null;
    priority?: number;
    notes?: string | null;
  }>;
}): Promise<{ created: number; skipped: number }> {
  const topic = await prisma.seoTopic.findUnique({ where: { id: input.topicId } });
  if (!topic) throw new Error("Không tìm thấy chủ đề SEO.");

  let created = 0;
  let skipped = 0;

  for (const item of input.keywords) {
    const keyword = item.keyword.trim().replace(/\s+/g, " ");
    if (!keyword) continue;
    const normalized = normalizeSeoKeyword(keyword);

    try {
      await prisma.seoKeyword.create({
        data: {
          topicId: input.topicId,
          keyword,
          normalized,
          keywordType: item.keywordType,
          searchIntent: item.searchIntent ?? null,
          source: item.source ?? "Manual",
          searchVolume: item.searchVolume ?? null,
          keywordDifficulty: item.keywordDifficulty ?? null,
          cpc: item.cpc ?? null,
          priority: item.priority ?? 0,
          notes: item.notes ?? null,
        },
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return { created, skipped };
}

export async function bulkPasteSeoKeywords(input: {
  topicId: string;
  text: string;
  keywordType?: SeoKeywordType;
  source?: string;
}): Promise<{ created: number; skipped: number; parsed: number }> {
  const lines = dedupeKeywords(parseBulkKeywordLines(input.text));
  const result = await addSeoKeywords({
    topicId: input.topicId,
    keywords: lines.map((keyword) => ({
      keyword,
      keywordType: input.keywordType ?? "SECONDARY",
      source: input.source ?? "Manual",
    })),
  });
  return { ...result, parsed: lines.length };
}

export async function updateSeoKeyword(
  id: string,
  input: Partial<{
    keyword: string;
    keywordType: SeoKeywordType;
    searchIntent: SeoSearchIntent | null;
    source: string | null;
    searchVolume: number | null;
    keywordDifficulty: number | null;
    cpc: number | null;
    priority: number;
    notes: string | null;
  }>,
): Promise<void> {
  const existing = await prisma.seoKeyword.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy từ khóa.");

  const keyword =
    input.keyword !== undefined ? input.keyword.trim().replace(/\s+/g, " ") : existing.keyword;
  const normalized = normalizeSeoKeyword(keyword);

  await prisma.seoKeyword.update({
    where: { id },
    data: {
      ...(input.keyword !== undefined ? { keyword, normalized } : {}),
      ...(input.keywordType !== undefined ? { keywordType: input.keywordType } : {}),
      ...(input.searchIntent !== undefined ? { searchIntent: input.searchIntent } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.searchVolume !== undefined ? { searchVolume: input.searchVolume } : {}),
      ...(input.keywordDifficulty !== undefined
        ? { keywordDifficulty: input.keywordDifficulty }
        : {}),
      ...(input.cpc !== undefined ? { cpc: input.cpc } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}

export async function deleteSeoKeyword(id: string): Promise<void> {
  await prisma.seoKeyword.delete({ where: { id } });
}
