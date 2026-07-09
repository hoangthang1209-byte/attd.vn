import type { PatternSourceType } from "@prisma/client";

export const PATTERN_SOURCE_TYPES: PatternSourceType[] = [
  "INTERNAL",
  "EXTERNAL_STUDIO",
  "CUSTOMER",
  "FACTORY",
  "OTHER",
];

export const PATTERN_SOURCE_LABELS: Record<PatternSourceType, string> = {
  INTERNAL: "Nội bộ",
  EXTERNAL_STUDIO: "Phòng rập ngoài",
  CUSTOMER: "Khách hàng gửi",
  FACTORY: "Xưởng gửi",
  OTHER: "Khác",
};

export const PATTERN_SOURCE_BADGE_LABELS: Record<PatternSourceType, string> = {
  INTERNAL: "Nội bộ",
  EXTERNAL_STUDIO: "Phòng rập ngoài",
  CUSTOMER: "Khách gửi",
  FACTORY: "Xưởng gửi",
  OTHER: "Khác",
};

export function formatPatternSourceLabel(
  sourceType: PatternSourceType | null | undefined,
): string | null {
  if (!sourceType) return null;
  return PATTERN_SOURCE_LABELS[sourceType] ?? null;
}

export function formatPatternSourceBadge(
  sourceType: PatternSourceType | null | undefined,
): string | null {
  if (!sourceType) return null;
  return PATTERN_SOURCE_BADGE_LABELS[sourceType] ?? null;
}
