/**
 * Canonical structured-data keys for KB entries.
 * Stored in KnowledgeBaseEntry.structuredData JSON — practical editing, not over-normalized.
 */

export type StructuredMoq = {
  moq?: string;
  moqValue?: number;
  moqUnit?: string;
};

export type StructuredLeadTime = {
  leadTime?: string;
  leadTimeMinDays?: number;
  leadTimeMaxDays?: number;
};

export type StructuredMaterial = {
  material?: string;
  materialComposition?: string;
  fabricWeightGsm?: number;
};

export type StructuredCompatibility = {
  printCompatibility?: string[];
  embroideryCompatibility?: string[];
  washCompatibility?: string[];
};

export type StructuredBusinessContext = {
  factoryLocation?: string;
  country?: string;
  publicUrl?: string;
  allowedCta?: string[];
  businessUnits?: string[];
  targetCustomers?: string[];
  capacity?: string;
};

export type KnowledgeStructuredData = StructuredMoq &
  StructuredLeadTime &
  StructuredMaterial &
  StructuredCompatibility &
  StructuredBusinessContext &
  Record<string, unknown>;

export const STRUCTURED_NUMERIC_KEYS = [
  "moqValue",
  "leadTimeMinDays",
  "leadTimeMaxDays",
  "fabricWeightGsm",
] as const;

export const STRUCTURED_LIST_KEYS = [
  "colors",
  "sizes",
  "useCases",
  "services",
  "questions",
  "answers",
  "keyPoints",
  "printCompatibility",
  "embroideryCompatibility",
  "washCompatibility",
  "allowedCta",
  "businessUnits",
  "targetCustomers",
] as const;

export function normalizeStructuredData(
  raw: Record<string, unknown> | null | undefined
): KnowledgeStructuredData | null {
  if (!raw || typeof raw !== "object") return null;
  const result: KnowledgeStructuredData = { ...raw };

  for (const key of STRUCTURED_NUMERIC_KEYS) {
    const value: unknown = result[key];
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      result[key] = num;
    } else {
      delete result[key];
    }
  }

  for (const key of STRUCTURED_LIST_KEYS) {
    const value = result[key];
    if (value == null) continue;
    if (Array.isArray(value)) {
      result[key] = value.map(String).map((s) => s.trim()).filter(Boolean);
    } else if (typeof value === "string") {
      result[key] = value
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const keys = Object.keys(result).filter((k) => {
    const v = result[k];
    if (v == null) return false;
    if (typeof v === "string" && !v.trim()) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  if (keys.length === 0) return null;
  const cleaned: KnowledgeStructuredData = {};
  for (const key of keys) cleaned[key] = result[key];
  return cleaned;
}

export function hasStructuredField(
  data: Record<string, unknown> | null | undefined,
  keys: string[]
): boolean {
  if (!data) return false;
  return keys.some((key) => {
    const value = data[key];
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

export function structuredDataCoveragePercent(
  data: Record<string, unknown> | null | undefined,
  expectedKeys: string[]
): number {
  if (expectedKeys.length === 0) return 0;
  const filled = expectedKeys.filter((key) => hasStructuredField(data, [key])).length;
  return Math.round((filled / expectedKeys.length) * 100);
}

export function getExpectedStructuredKeysForType(type: string): string[] {
  switch (type) {
    case "PRODUCT":
    case "MATERIAL":
      return ["material", "moq", "moqValue", "colors", "sizes", "fabricWeightGsm"];
    case "OEM":
    case "MANUFACTURING":
      return ["moq", "moqValue", "leadTime", "leadTimeMinDays", "services", "printCompatibility"];
    case "DEALER":
    case "WHOLESALE":
      return ["targetAudience", "pricingPolicy", "targetCustomers"];
    case "POLICY":
    case "PRICING":
    case "LOGISTICS":
      return ["policyName", "conditions", "moq", "leadTime"];
    case "FAQ":
      return ["questions", "answers"];
    default:
      return ["keyPoints"];
  }
}
