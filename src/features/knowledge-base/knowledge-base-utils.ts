import type {
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
} from "@prisma/client";
import { toSlug } from "@/lib/slug";
import { buildCompletenessChecklist } from "@/features/knowledge-base/knowledge-base-completeness-checklist";

export {
  ENTRY_TYPE_OPTIONS,
  FILTER_ENTRY_TYPES,
  getEntryTypeLabel,
  getEntryStatusLabel,
  getPriorityLabel,
  getCompletenessLabel,
} from "@/features/knowledge-base/knowledge-base-labels";

export function generateKnowledgeBaseSlug(title: string): string {
  return toSlug(title.trim()) || "knowledge-entry";
}

export function normalizeKnowledgeBaseTags(tags: string[] | string | undefined): string[] {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : tags.split(",");
  return [...new Set(list.map((t) => t.trim()).filter(Boolean))];
}

export function calculateKnowledgeCompleteness(entry: {
  title: string;
  summary: string | null;
  content: string | null;
  structuredData: Record<string, unknown> | null;
  tags: string[];
  categoryId?: string;
  type?: KnowledgeBaseEntryType;
  usageScope?: string[];
  isVerified: boolean;
}): number {
  return buildCompletenessChecklist({
    title: entry.title,
    summary: entry.summary,
    content: entry.content,
    categoryId: entry.categoryId ?? "",
    tags: entry.tags,
    structuredData: entry.structuredData,
    type: entry.type ?? "COMPANY",
    isVerified: entry.isVerified,
  }).score;
}
