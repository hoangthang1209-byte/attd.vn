import type {
  AiBusinessRule,
  AiRetrievedFact,
  AiRetrievalContext,
} from "@/features/ai-retrieval/ai-retrieval-types";

function trimToLimit(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 20))}\n…[truncated]`;
}

export function buildAiRetrievalContextParts(input: {
  requestId: string;
  consumer: AiRetrievalContext["consumer"];
  purpose: AiRetrievalContext["purpose"];
  query: string;
  facts: AiRetrievedFact[];
  businessRules: AiBusinessRule[];
  conflicts: AiRetrievalContext["conflicts"];
  warnings: string[];
  omitted: AiRetrievalContext["omitted"];
  maxContextCharacters: number;
}): {
  contextText: string;
  contextJson: Record<string, unknown>;
  sourceManifest: AiRetrievalContext["sourceManifest"];
} {
  const sourceManifest = input.facts.map((fact) => ({
    factId: fact.id,
    sourceType: fact.sourceType,
    sourceId: fact.sourceId,
    title: fact.title,
    visibility: fact.visibility,
    adminRoute: fact.adminRoute ?? null,
  }));

  const lines: string[] = [
    "ATTD ENTERPRISE AI RETRIEVAL CONTEXT",
    `Consumer: ${input.consumer}`,
    `Purpose: ${input.purpose}`,
    `Query: ${input.query || "(entity scope)"}`,
    `Request: ${input.requestId}`,
    "",
    "Safety:",
    "- Do not invent facts not listed below.",
    "- Respect visibility and publicOutputAllowed.",
    "- Prefer higher-authority sources when conflicts exist.",
    "- Do not expose confidential or cost data.",
    "",
  ];

  for (const fact of input.facts) {
    lines.push(`[FACT]`);
    lines.push(`Title: ${fact.title}`);
    lines.push(`Source: ${fact.sourceName ?? fact.sourceType} (${fact.sourceType})`);
    lines.push(`Visibility: ${fact.visibility}`);
    lines.push(`Public output: ${fact.publicOutputAllowed ? "Allowed" : "Not allowed"}`);
    if (fact.claimStatus) lines.push(`Claim: ${fact.claimStatus}`);
    if (fact.lastVerifiedAt) lines.push(`Verified: ${fact.lastVerifiedAt}`);
    if (fact.authorityReason) lines.push(`Authority: ${fact.authorityReason} (rank ${fact.authorityRank})`);
    if (fact.summary) lines.push(`Summary: ${fact.summary}`);
    if (fact.structuredData) {
      for (const [key, value] of Object.entries(fact.structuredData)) {
        if (value == null) continue;
        if (key === "keywords" || key === "fabricatedMetrics") continue;
        const rendered = Array.isArray(value) ? value.join(", ") : String(value);
        if (rendered.trim()) lines.push(`${key}: ${rendered}`);
      }
    }
    if (fact.warnings.length) lines.push(`Warnings: ${fact.warnings.join("; ")}`);
    lines.push("");
  }

  for (const rule of input.businessRules) {
    lines.push(`[BUSINESS RULE]`);
    lines.push(`Title: ${rule.title}`);
    if (rule.appliesTo?.length) lines.push(`Applies to: ${rule.appliesTo.join(", ")}`);
    if (rule.condition) lines.push(`Condition: ${JSON.stringify(rule.condition)}`);
    lines.push(`Outcome: ${JSON.stringify(rule.outcome)}`);
    lines.push(`Approved: ${rule.approved ? "yes" : "no"}`);
    lines.push("");
  }

  if (input.conflicts.length) {
    lines.push(`[CONFLICTS]`);
    for (const conflict of input.conflicts) {
      lines.push(`- ${conflict.key}: ${conflict.warning} (${conflict.resolution})`);
    }
    lines.push("");
  }

  if (input.omitted.length) {
    lines.push(`[OMITTED]`);
    for (const row of input.omitted) {
      lines.push(`- ${row.reason}: ${row.count}`);
    }
    lines.push("");
  }

  const contextText = trimToLimit(lines.join("\n"), input.maxContextCharacters);

  const contextJson: Record<string, unknown> = {
    requestId: input.requestId,
    consumer: input.consumer,
    purpose: input.purpose,
    query: input.query,
    facts: input.facts.map((fact) => ({
      id: fact.id,
      sourceType: fact.sourceType,
      sourceId: fact.sourceId,
      title: fact.title,
      summary: fact.summary,
      visibility: fact.visibility,
      publicOutputAllowed: fact.publicOutputAllowed,
      claimStatus: fact.claimStatus,
      authorityRank: fact.authorityRank,
      authorityReason: fact.authorityReason,
      structuredData: fact.structuredData,
      stale: fact.stale,
      warnings: fact.warnings,
    })),
    businessRules: input.businessRules,
    conflicts: input.conflicts,
    warnings: input.warnings,
    omitted: input.omitted,
    sourceManifest,
    safety: {
      inventFacts: false,
      respectVisibility: true,
      preferHigherAuthority: true,
      noConfidentialLeakage: true,
    },
  };

  return { contextText, contextJson, sourceManifest };
}
