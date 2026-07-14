import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import { rankKnowledgeEntriesForQuery } from "@/features/knowledge-base/knowledge-base-context-preview";
import {
  filterEntriesByVisibility,
  type KnowledgeVisibilityAudience,
} from "@/features/knowledge-base/knowledge-base-visibility";
import { isClaimSafeForAiOutput } from "@/features/knowledge-base/knowledge-base-claim-governance";
import { getEntrySourceInfo } from "@/features/knowledge-base/knowledge-base-source-utils";

export type KnowledgeRetrievalInput = {
  query: string;
  audience?: KnowledgeVisibilityAudience;
  usageScope?: string[];
  categoryIds?: string[];
  types?: string[];
  verifiedOnly?: boolean;
  claimSafeOnly?: boolean;
  limit?: number;
};

export type KnowledgeRetrievalItem = {
  entry: KnowledgeBaseEntryRecord;
  score: number;
  matchReasons: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  mediaBundleIds: string[];
  claimStatus: string;
  visibility: string;
};

export type KnowledgeRetrievalResult = {
  query: string;
  audience: KnowledgeVisibilityAudience;
  items: KnowledgeRetrievalItem[];
  warnings: string[];
};

export function retrieveKnowledgeForAi(
  entries: KnowledgeBaseEntryRecord[],
  input: KnowledgeRetrievalInput
): KnowledgeRetrievalResult {
  const audience = input.audience ?? "INTERNAL_AI";
  const warnings: string[] = [];

  let pool = filterEntriesByVisibility(entries, audience);

  if (input.types?.length) {
    pool = pool.filter((entry) => input.types!.includes(entry.type));
  }

  if (input.verifiedOnly) {
    pool = pool.filter((entry) => entry.isVerified);
  }

  if (input.claimSafeOnly) {
    pool = pool.filter((entry) => isClaimSafeForAiOutput(entry.claimStatus));
  }

  const ranked = rankKnowledgeEntriesForQuery(pool, {
    query: input.query,
    usageScope: input.usageScope,
    categoryIds: input.categoryIds,
    limit: input.limit ?? 8,
  });

  if (ranked.results.length === 0) {
    warnings.push("Không tìm thấy knowledge phù hợp sau khi lọc visibility/claim.");
  }

  const unverified = ranked.results.filter((r) => !r.entry.isVerified);
  if (unverified.length > 0) {
    warnings.push(`${unverified.length} entry chưa verified trong kết quả.`);
  }

  const items: KnowledgeRetrievalItem[] = ranked.results.map((result) => {
    const source = getEntrySourceInfo(result.entry);
    return {
      entry: result.entry,
      score: result.score,
      matchReasons: result.matchReasons,
      sourceName: source.name,
      sourceUrl: source.url,
      mediaBundleIds: result.entry.relatedMediaBundleIds ?? [],
      claimStatus: result.entry.claimStatus,
      visibility: result.entry.visibility,
    };
  });

  return { query: input.query, audience, items, warnings };
}

export function formatRetrievalContext(items: KnowledgeRetrievalItem[]): string {
  const lines: string[] = ["ATTD KNOWLEDGE RETRIEVAL"];
  for (const item of items) {
    lines.push(`\n## ${item.entry.title} [${item.entry.type}]`);
    if (item.entry.summary) lines.push(item.entry.summary);
    if (item.entry.structuredData) {
      for (const [key, value] of Object.entries(item.entry.structuredData)) {
        if (Array.isArray(value)) lines.push(`- ${key}: ${value.join(", ")}`);
        else if (value != null) lines.push(`- ${key}: ${String(value)}`);
      }
    }
    lines.push(`Source: ${item.sourceName ?? "n/a"} | Claim: ${item.claimStatus} | Visibility: ${item.visibility}`);
  }
  lines.push("\nRules: Do not invent facts. Respect visibility and claim status.");
  return lines.join("\n");
}
