import type {
  AiBusinessRule,
  KnowledgeVisibility,
} from "@/features/ai-retrieval/ai-retrieval-types";

type KnowledgeLike = {
  id: string;
  title: string;
  visibility: KnowledgeVisibility;
  approvedAt?: string | null;
  structuredData?: Record<string, unknown> | null;
};

const OUTCOME_KEYS = [
  "moqValue",
  "moqUnit",
  "moq",
  "leadTimeMinDays",
  "leadTimeMaxDays",
  "leadTime",
  "capacity",
  "targetCustomers",
  "businessUnits",
] as const;

/**
 * Extract structured business rules only when structured keys exist.
 * Never invent conditions from free text.
 */
export function extractBusinessRulesFromKnowledge(entries: KnowledgeLike[]): AiBusinessRule[] {
  const rules: AiBusinessRule[] = [];

  for (const entry of entries) {
    const data = entry.structuredData;
    if (!data || Object.keys(data).length === 0) continue;

    const outcome: Record<string, unknown> = {};
    for (const key of OUTCOME_KEYS) {
      if (data[key] != null && data[key] !== "") outcome[key] = data[key];
    }
    if (Object.keys(outcome).length === 0) continue;

    const condition =
      data.conditions && typeof data.conditions === "object" && !Array.isArray(data.conditions)
        ? (data.conditions as Record<string, unknown>)
        : typeof data.conditions === "string" && data.conditions.trim()
          ? { text: data.conditions }
          : null;

    const exceptions = Array.isArray(data.exceptions)
      ? data.exceptions.filter(
          (item): item is Record<string, unknown> =>
            item != null && typeof item === "object" && !Array.isArray(item)
        )
      : undefined;

    const appliesTo = Array.isArray(data.appliesTo)
      ? data.appliesTo.map(String)
      : Array.isArray(data.businessUnits)
        ? data.businessUnits.map(String)
        : undefined;

    rules.push({
      id: `rule-${entry.id}`,
      title: entry.title,
      condition,
      outcome,
      exceptions: exceptions?.length ? exceptions : undefined,
      appliesTo,
      priority: typeof data.priority === "number" ? data.priority : 50,
      visibility: entry.visibility,
      sourceEntryId: entry.id,
      approved: Boolean(entry.approvedAt),
      validFrom: typeof data.validFrom === "string" ? data.validFrom : null,
      validUntil: typeof data.validUntil === "string" ? data.validUntil : null,
    });
  }

  return rules;
}
