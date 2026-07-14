import type { KnowledgeBaseVisibility } from "@prisma/client";

export type KnowledgeVisibilityAudience =
  | "PUBLIC_AI"
  | "INTERNAL_AI"
  | "SALES_COPILOT"
  | "SUPPORT_COPILOT"
  | "ADMIN";

const VISIBILITY_RANK: Record<KnowledgeBaseVisibility, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
};

export const KNOWLEDGE_VISIBILITY_OPTIONS: {
  id: KnowledgeBaseVisibility;
  label: string;
  description: string;
}[] = [
  {
    id: "PUBLIC",
    label: "Công khai",
    description: "Có thể dùng cho website, SEO, FAQ công khai.",
  },
  {
    id: "INTERNAL",
    label: "Nội bộ",
    description: "Chỉ dùng trong admin và AI nội bộ.",
  },
  {
    id: "CONFIDENTIAL",
    label: "Bảo mật",
    description: "Giá vốn, margin, nhà cung cấp — không đưa vào AI công khai.",
  },
];

export function getMaxVisibilityForAudience(
  audience: KnowledgeVisibilityAudience
): KnowledgeBaseVisibility {
  switch (audience) {
    case "PUBLIC_AI":
      return "PUBLIC";
    case "INTERNAL_AI":
    case "SALES_COPILOT":
    case "SUPPORT_COPILOT":
      return "INTERNAL";
    case "ADMIN":
      return "CONFIDENTIAL";
    default:
      return "INTERNAL";
  }
}

export function isVisibilityAllowedForAudience(
  visibility: KnowledgeBaseVisibility,
  audience: KnowledgeVisibilityAudience
): boolean {
  const maxRank = VISIBILITY_RANK[getMaxVisibilityForAudience(audience)];
  return VISIBILITY_RANK[visibility] <= maxRank;
}

export function filterEntriesByVisibility<T extends { visibility?: KnowledgeBaseVisibility }>(
  entries: T[],
  audience: KnowledgeVisibilityAudience
): T[] {
  return entries.filter((entry) =>
    isVisibilityAllowedForAudience(entry.visibility ?? "INTERNAL", audience)
  );
}

export function inferVisibilityFromUsageScope(usageScope: string[]): KnowledgeBaseVisibility {
  if (usageScope.includes("PUBLIC_FAQ")) return "PUBLIC";
  if (usageScope.includes("INTERNAL_ONLY")) return "INTERNAL";
  return "INTERNAL";
}
