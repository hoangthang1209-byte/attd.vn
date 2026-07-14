import type { AiRetrievedFact, AiRetrievalConflict } from "@/features/ai-retrieval/ai-retrieval-types";
import type {
  ContentContextConflict,
  ContentContextFact,
} from "@/features/content-context/content-context.types";

const COST_KEYS = /cost|margin|supplier|gia\s*von|giá\s*vốn|costPrice|unitCost/i;

export function stripUnsafeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSensitiveStructuredValue(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const walk = (obj: Record<string, unknown>): boolean => {
    for (const [k, v] of Object.entries(obj)) {
      if (COST_KEYS.test(k)) return true;
      if (v && typeof v === "object" && walk(v as Record<string, unknown>)) return true;
    }
    return false;
  };
  return walk(value as Record<string, unknown>);
}

export function scoreContentContextFact(
  fact: AiRetrievedFact,
  opts: {
    primaryKeyword: string;
    relatedIds: Set<string>;
    required: boolean;
  },
): number {
  let score = 0;
  if (opts.required) score += 30;
  if (opts.relatedIds.has(fact.sourceId)) score += 25;
  score += Math.min(20, Math.max(0, fact.authorityRank / 5));
  const kw = opts.primaryKeyword.trim().toLowerCase();
  if (kw && (fact.title.toLowerCase().includes(kw) || fact.summary?.toLowerCase().includes(kw))) {
    score += 15;
  }
  if (fact.matchedOn.some((m) => m.toLowerCase().includes("primary"))) score += 15;
  if (fact.approvedAt && !fact.legacyVerifiedNotApproved) score += 10;
  if (fact.evidenceUrl) score += 5;
  if (fact.stale) score -= 12;
  if (fact.legacyVerifiedNotApproved) score -= 8;
  if (fact.claimStatus === "NEEDS_EVIDENCE") score -= 15;
  return score;
}

export function normalizeRetrievalFact(
  fact: AiRetrievedFact,
  opts: {
    primaryKeyword: string;
    relatedIds: Set<string>;
    required: boolean;
  },
): ContentContextFact | null {
  if (fact.visibility === "CONFIDENTIAL") return null;
  if (!fact.publicOutputAllowed) return null;

  const statement = stripUnsafeHtml(
    fact.summary?.trim() ||
      fact.content?.trim()?.slice(0, 800) ||
      fact.title,
  );

  let priorityScore = 0;
  if (opts.required) priorityScore += 30;
  if (opts.relatedIds.has(fact.sourceId)) priorityScore += 25;
  priorityScore += Math.min(20, Math.max(0, Math.round(fact.authorityRank / 5)));
  const kw = opts.primaryKeyword.trim().toLowerCase();
  if (
    kw &&
    (fact.title.toLowerCase().includes(kw) ||
      fact.summary?.toLowerCase().includes(kw) ||
      statement.toLowerCase().includes(kw))
  ) {
    priorityScore += 15;
  }
  if (fact.matchedOn.some((m) => /primary|keyword/i.test(m))) priorityScore += 10;
  if (fact.approvedAt && !fact.legacyVerifiedNotApproved) priorityScore += 10;
  if (fact.evidenceUrl) priorityScore += 5;
  if (fact.stale) priorityScore -= 12;
  if (fact.legacyVerifiedNotApproved) priorityScore -= 8;
  if (fact.claimStatus === "NEEDS_EVIDENCE") priorityScore -= 15;

  return {
    factId: fact.id,
    statement,
    structuredValue: sanitizeStructured(fact.structuredData),
    sourceType: fact.sourceType,
    sourceId: fact.sourceId,
    sourceTitle: stripUnsafeHtml(fact.title),
    authorityRank: fact.authorityRank,
    visibility: fact.visibility === "INTERNAL" ? "INTERNAL" : "PUBLIC",
    publicOutputAllowed: fact.publicOutputAllowed && fact.visibility === "PUBLIC",
    claimStatus: fact.claimStatus ?? null,
    confidence: fact.confidence ?? null,
    evidenceUrl: fact.evidenceUrl ?? null,
    lastVerifiedAt: fact.lastVerifiedAt ?? null,
    stale: fact.stale,
    required: opts.required,
    matchedOn: fact.matchedOn,
    warnings: [
      ...fact.warnings,
      ...(fact.legacyVerifiedNotApproved ? ["legacy_verified_not_approved"] : []),
      ...(isSensitiveStructuredValue(fact.structuredData)
        ? ["sensitive_fields_stripped"]
        : []),
    ],
    priorityScore,
  };
}

function sanitizeStructured(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (COST_KEYS.test(k)) continue;
    if (k === "storageKey" || k === "publicId" || k === "internalNotes") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Keep highest-authority fact per normalized statement/key; merge when Product beats KB MOQ.
 */
export function dedupeContentContextFacts(facts: ContentContextFact[]): ContentContextFact[] {
  const byKey = new Map<string, ContentContextFact>();

  for (const fact of facts) {
    const key = normalizeFactKey(fact);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fact);
      continue;
    }
    const prefer =
      fact.authorityRank > existing.authorityRank ||
      (fact.authorityRank === existing.authorityRank && fact.priorityScore > existing.priorityScore)
        ? fact
        : existing;
    const other = prefer.factId === fact.factId ? existing : fact;
    byKey.set(key, {
      ...prefer,
      warnings: [
        ...new Set([
          ...prefer.warnings,
          ...other.warnings,
          `deduped_source:${other.sourceType}:${other.sourceId}`,
        ]),
      ],
    });
  }

  return [...byKey.values()].sort((a, b) => b.priorityScore - a.priorityScore);
}

function normalizeFactKey(fact: ContentContextFact): string {
  const structured = fact.structuredValue ?? {};
  if ("moqValue" in structured || "moq" in structured || /moq/i.test(fact.statement)) {
    return `moq:${fact.sourceType === "PRODUCT" ? fact.sourceId : "shared"}`;
  }
  const q = fact.statement.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return `${fact.sourceType}:${q.slice(0, 120)}`;
}

export function convertRetrievalConflicts(
  conflicts: AiRetrievalConflict[],
): ContentContextConflict[] {
  return conflicts.map((c) => ({
    key: c.key,
    competingFacts: c.facts.map((f) => ({
      factId: f.factId,
      sourceType: f.sourceType,
      value: f.value,
      authorityRank: f.authorityRank,
    })),
    selectedFactId: c.selectedFactId ?? null,
    resolution: c.resolution,
    publicUseAllowed: c.resolution !== "UNRESOLVED",
    warning: c.warning,
  }));
}

export function filterPublicFactsOnly(facts: ContentContextFact[]): ContentContextFact[] {
  return facts.filter((f) => f.visibility === "PUBLIC" && f.publicOutputAllowed);
}
