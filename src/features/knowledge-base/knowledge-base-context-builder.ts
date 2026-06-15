import type { SeoCampaign } from "@/features/blog/seo-planning-types";
import type {
  KnowledgeBaseContextPreviewInput,
  KnowledgeBaseContextPreviewResult,
  KnowledgeBaseEntryRecord,
  KnowledgeReadinessResult,
} from "@/features/knowledge-base/knowledge-base-types";
import {
  calculateKnowledgeCompleteness,
  getCompletenessLabel,
  getEntryTypeLabel,
} from "@/features/knowledge-base/knowledge-base-utils";
import {
  filterKnowledgeByUsageScope,
  getRecommendedKnowledgeForBlueprint,
  getRecommendedKnowledgeForKeyword,
} from "@/features/knowledge-base/knowledge-base-search";

export type BuildAiContextOptions = {
  keyword?: string;
  blueprintId?: string;
  usageScope?: string;
  maxEntries?: number;
  verifiedOnly?: boolean;
  entryIds?: string[];
};

const CONTEXT_RULES = `
Rules:
- Do not invent data not found in the knowledge base.
- Prefer verified entries.
- Use Vietnamese business tone.
- Mark uncertain starter data as needs verification when used.
`.trim();

export function buildAiContextFromKnowledgeBase(
  entries: KnowledgeBaseEntryRecord[],
  options: BuildAiContextOptions = {}
): KnowledgeBaseContextPreviewResult {
  const maxEntries = options.maxEntries ?? 8;
  let selected = [...entries];

  if (options.entryIds?.length) {
    const idSet = new Set(options.entryIds);
    selected = selected.filter((entry) => idSet.has(entry.id));
  }

  if (options.usageScope) {
    selected = filterKnowledgeByUsageScope(selected, options.usageScope);
  }

  if (options.verifiedOnly) {
    selected = selected.filter((entry) => entry.isVerified);
  }

  selected = selected.filter((entry) => entry.status === "ACTIVE" || entry.status === "DRAFT");

  if (options.keyword) {
    const recommended = getRecommendedKnowledgeForKeyword(options.keyword, selected);
    selected = recommended.length > 0 ? recommended : selected;
  } else if (options.blueprintId) {
    const recommended = getRecommendedKnowledgeForBlueprint(options.blueprintId, selected);
    selected = recommended.length > 0 ? recommended : selected;
  }

  selected = selected
    .sort((a, b) => {
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, maxEntries);

  const warnings: string[] = [];
  if (selected.length === 0) {
    warnings.push("Không tìm thấy entry phù hợp trong Knowledge Base.");
  }
  if (selected.some((entry) => !entry.isVerified)) {
    warnings.push("Có entry chưa verified — cần kiểm chứng trước khi dùng cho AI.");
  }
  if (!selected.some((entry) => entry.type === "PRODUCT")) {
    warnings.push("Thiếu dữ liệu sản phẩm liên quan.");
  }
  if (!selected.some((entry) => entry.type === "POLICY" || entry.type === "PRICING")) {
    warnings.push("Thiếu chính sách MOQ / pricing.");
  }
  if (!selected.some((entry) => entry.type === "CASE_STUDY")) {
    warnings.push("Chưa có case study liên quan.");
  }

  const contextText = formatContextText(selected);
  const completenessScore =
    selected.length > 0
      ? Math.round(
          selected.reduce((sum, entry) => sum + calculateKnowledgeCompleteness(entry), 0) /
            selected.length
        )
      : 0;

  const verifiedCount = selected.filter((entry) => entry.isVerified).length;
  const unverifiedCount = selected.length - verifiedCount;

  const missingKnowledge: string[] = [];
  if (!selected.some((entry) => entry.type === "PRODUCT" || entry.type === "MATERIAL")) {
    missingKnowledge.push("Thiếu dữ liệu sản phẩm");
  }
  if (!selected.some((entry) => entry.type === "OEM" || entry.type === "MANUFACTURING")) {
    missingKnowledge.push("Thiếu chính sách OEM");
  }
  if (!selected.some((entry) => entry.type === "POLICY" || entry.type === "PRICING")) {
    missingKnowledge.push("Thiếu chính sách MOQ / pricing");
  }
  if (!selected.some((entry) => entry.type === "CASE_STUDY")) {
    missingKnowledge.push("Thiếu case study");
  }
  if (selected.some((entry) => !entry.structuredData || Object.keys(entry.structuredData).length === 0)) {
    missingKnowledge.push("Thiếu dữ liệu chi tiết ở một số mục");
  }

  return {
    selectedEntries: selected,
    contextText,
    warnings,
    completenessScore,
    completenessLabel: getCompletenessLabel(completenessScore),
    verifiedCount,
    unverifiedCount,
    missingKnowledge,
  };
}

function formatContextText(entries: KnowledgeBaseEntryRecord[]): string {
  const sections = new Map<string, string[]>();

  for (const entry of entries) {
    const label = getEntryTypeLabel(entry.type);
    const lines = sections.get(label) ?? [];
    if (entry.summary?.trim()) {
      lines.push(`- ${entry.summary.trim()}`);
    } else if (entry.content?.trim()) {
      lines.push(`- ${entry.content.trim().slice(0, 240)}`);
    } else {
      lines.push(`- ${entry.title}`);
    }

    if (entry.structuredData && Object.keys(entry.structuredData).length > 0) {
      for (const [key, value] of Object.entries(entry.structuredData)) {
        if (Array.isArray(value)) {
          lines.push(`  • ${key}: ${value.join(", ")}`);
        } else if (value != null) {
          lines.push(`  • ${key}: ${String(value)}`);
        }
      }
    }

    sections.set(label, lines);
  }

  const body = [...sections.entries()]
    .map(([label, lines]) => `${label}:\n${lines.join("\n")}`)
    .join("\n\n");

  return `ATTD BUSINESS CONTEXT\n\n${body}\n\n${CONTEXT_RULES}`;
}

export function getKnowledgeContextForAiFactory(options: BuildAiContextOptions & {
  entries: KnowledgeBaseEntryRecord[];
}): KnowledgeBaseContextPreviewResult {
  return buildAiContextFromKnowledgeBase(options.entries, {
    ...options,
    usageScope: options.usageScope ?? "BLOG_AI",
    verifiedOnly: options.verifiedOnly ?? false,
  });
}

export function calculateKnowledgeReadinessForCampaign(
  campaign: SeoCampaign,
  entries: KnowledgeBaseEntryRecord[]
): KnowledgeReadinessResult {
  const keyword = campaign.mainKeyword.toLowerCase();
  const relevant = getRecommendedKnowledgeForKeyword(keyword, entries);

  const productData = relevant.filter((e) => e.type === "PRODUCT" || e.type === "MATERIAL").length;
  const oemData = relevant.filter((e) => e.type === "OEM" || e.type === "MANUFACTURING").length;
  const dealerData = relevant.filter((e) => e.type === "DEALER" || e.type === "WHOLESALE").length;
  const policyData = relevant.filter((e) => e.type === "POLICY" || e.type === "PRICING" || e.type === "LOGISTICS").length;

  let score = 0;
  score += Math.min(25, productData * 8);
  score += Math.min(25, oemData * 10);
  score += Math.min(25, dealerData * 10);
  score += Math.min(25, policyData * 12);

  const warnings: string[] = [];
  if (score < 65) {
    warnings.push("Cluster này chưa có đủ dữ liệu Knowledge Base để AI viết bài có chiều sâu.");
  }
  if (productData === 0) warnings.push("Thiếu dữ liệu sản phẩm.");
  if (policyData === 0) warnings.push("Thiếu chính sách / logistics.");

  return {
    score: Math.min(100, score),
    label: getCompletenessLabel(Math.min(100, score)),
    productData,
    oemData,
    dealerData,
    policyData,
    warnings,
  };
}

export function previewKnowledgeContext(
  entries: KnowledgeBaseEntryRecord[],
  input: KnowledgeBaseContextPreviewInput
): KnowledgeBaseContextPreviewResult {
  return buildAiContextFromKnowledgeBase(entries, {
    keyword: input.keyword,
    blueprintId: input.blueprintId,
    usageScope: input.usageScope,
    maxEntries: input.maxEntries,
    verifiedOnly: input.verifiedOnly,
    entryIds: input.entryIds,
  });
}
