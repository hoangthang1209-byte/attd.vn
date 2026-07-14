import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import type { KnowledgeBaseClaimStatus } from "@prisma/client";
import { getClaimGovernanceWarnings } from "@/features/knowledge-base/knowledge-base-claim-governance";
import { getEntrySourceInfo } from "@/features/knowledge-base/knowledge-base-source-utils";

export type AiReadinessLevel = "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";

export type AiReadinessResult = {
  score: number;
  level: AiReadinessLevel;
  label: string;
  reasons: string[];
  missing: string[];
};

const LEVEL_LABELS: Record<AiReadinessLevel, string> = {
  LOW: "Chưa sẵn sàng",
  MEDIUM: "Có thể dùng",
  HIGH: "Tốt cho AI",
  VERIFIED: "Đã kiểm chứng",
};

export function getAiReadinessLabel(level: AiReadinessLevel): string {
  return LEVEL_LABELS[level];
}

export function calculateKnowledgeAiReadiness(entry: {
  title: string;
  content: string | null;
  categoryId?: string;
  tags?: string[];
  aliases?: string[];
  usageScope?: string[];
  isVerified?: boolean;
  priority?: string;
  sourceId?: string | null;
  structuredData?: Record<string, unknown> | null;
  visibility?: string;
  claimStatus?: string;
  evidenceUrl?: string | null;
  approvedBy?: string | null;
  version?: number;
  source?: { name: string; url?: string | null } | null;
}): AiReadinessResult {
  let score = 0;
  const reasons: string[] = [];
  const missing: string[] = [];

  if (entry.title?.trim()) {
    score += 10;
    reasons.push("Có tiêu đề");
  } else {
    missing.push("Thiếu tiêu đề");
  }

  const contentLen = entry.content?.trim().length ?? 0;
  if (contentLen > 0) {
    score += 20;
    reasons.push("Có nội dung");
    if (contentLen > 100) {
      score += 10;
      reasons.push("Nội dung đủ dài (>100 ký tự)");
    }
    if (contentLen > 300) {
      score += 10;
      reasons.push("Nội dung chi tiết (>300 ký tự)");
    }
  } else {
    missing.push("Thiếu nội dung");
  }

  if (entry.isVerified) {
    score += 25;
    reasons.push("Đã kiểm chứng");
  } else {
    missing.push("Chưa kiểm chứng");
  }

  if (entry.categoryId) {
    score += 10;
    reasons.push("Có danh mục");
  } else {
    missing.push("Thiếu danh mục");
  }

  if ((entry.tags?.length ?? 0) > 0) {
    score += 10;
    reasons.push("Có tags");
  } else {
    missing.push("Thiếu tags");
  }

  if ((entry.aliases?.length ?? 0) > 0) {
    score += 5;
    reasons.push("Có aliases");
  }

  if (entry.structuredData && Object.keys(entry.structuredData).length > 0) {
    score += 10;
    reasons.push("Có structured data");
  } else {
    missing.push("Thiếu structured data");
  }

  if (entry.visibility) {
    score += 3;
    reasons.push(`Visibility: ${entry.visibility}`);
  }

  const claimWarnings = getClaimGovernanceWarnings({
    claimStatus: (entry.claimStatus ?? "FACT") as KnowledgeBaseClaimStatus,
    evidenceUrl: entry.evidenceUrl,
    approvedBy: entry.approvedBy,
    isVerified: Boolean(entry.isVerified),
  });
  if (claimWarnings.length === 0 && entry.claimStatus) {
    score += 5;
    reasons.push("Claim governance ổn");
  } else {
    missing.push(...claimWarnings);
  }

  if ((entry.usageScope?.length ?? 0) > 0) {
    score += 10;
    reasons.push("Có mục đích sử dụng");
  } else {
    missing.push("Thiếu mục đích sử dụng");
  }

  const sourceInfo = getEntrySourceInfo(entry);
  if (sourceInfo.name || sourceInfo.url) {
    score += 10;
    reasons.push("Có nguồn tham khảo");
  } else {
    missing.push("Thiếu nguồn tham khảo");
  }

  if (entry.priority === "HIGH") {
    score += 5;
    reasons.push("Ưu tiên cao");
  }

  score = Math.min(100, score);

  let level: AiReadinessLevel = "LOW";
  if (score >= 90 && entry.isVerified) level = "VERIFIED";
  else if (score >= 70) level = "HIGH";
  else if (score >= 40) level = "MEDIUM";

  return { score, level, label: LEVEL_LABELS[level], reasons, missing };
}

export function enrichEntryWithAiReadiness<T extends KnowledgeBaseEntryRecord>(entry: T) {
  const aiReadiness = calculateKnowledgeAiReadiness(entry);
  return { ...entry, aiReadiness };
}
