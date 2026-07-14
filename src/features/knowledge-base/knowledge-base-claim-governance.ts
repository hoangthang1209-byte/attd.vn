import type { KnowledgeBaseClaimStatus } from "@prisma/client";

export const KNOWLEDGE_CLAIM_STATUS_OPTIONS: {
  id: KnowledgeBaseClaimStatus;
  label: string;
  description: string;
}[] = [
  { id: "FACT", label: "Sự thật", description: "Thông tin khách quan, có thể kiểm chứng." },
  { id: "OPINION", label: "Ý kiến", description: "Đánh giá chủ quan — không dùng như fact." },
  {
    id: "MARKETING_CLAIM",
    label: "Claim marketing",
    description: "Thông điệp bán hàng — cần kiểm soát khi AI viết.",
  },
  {
    id: "VERIFIED_CLAIM",
    label: "Claim đã xác minh",
    description: "Đã có evidence và phê duyệt.",
  },
  {
    id: "NEEDS_EVIDENCE",
    label: "Cần bằng chứng",
    description: "Chưa đủ evidence — AI không được khẳng định.",
  },
];

export function isClaimSafeForAiOutput(claimStatus: KnowledgeBaseClaimStatus): boolean {
  return claimStatus === "FACT" || claimStatus === "VERIFIED_CLAIM";
}

export function requiresEvidence(claimStatus: KnowledgeBaseClaimStatus): boolean {
  return claimStatus === "NEEDS_EVIDENCE" || claimStatus === "MARKETING_CLAIM";
}

export function resolveClaimStatusOnVerify(input: {
  claimStatus: KnowledgeBaseClaimStatus;
  evidenceUrl?: string | null;
  isVerified: boolean;
}): KnowledgeBaseClaimStatus {
  if (!input.isVerified) {
    if (input.claimStatus === "VERIFIED_CLAIM") return "NEEDS_EVIDENCE";
    return input.claimStatus;
  }
  if (input.claimStatus === "NEEDS_EVIDENCE" && input.evidenceUrl?.trim()) {
    return "VERIFIED_CLAIM";
  }
  if (input.claimStatus === "MARKETING_CLAIM" && input.evidenceUrl?.trim()) {
    return "VERIFIED_CLAIM";
  }
  return input.claimStatus;
}

export function getClaimGovernanceWarnings(entry: {
  claimStatus: KnowledgeBaseClaimStatus;
  evidenceUrl?: string | null;
  approvedBy?: string | null;
  isVerified: boolean;
}): string[] {
  const warnings: string[] = [];
  if (requiresEvidence(entry.claimStatus) && !entry.evidenceUrl?.trim()) {
    warnings.push("Claim cần evidenceUrl trước khi AI sử dụng.");
  }
  if (entry.claimStatus === "VERIFIED_CLAIM" && !entry.approvedBy?.trim()) {
    warnings.push("Claim đã xác minh nên có approvedBy.");
  }
  if (entry.isVerified && !isClaimSafeForAiOutput(entry.claimStatus) && entry.claimStatus !== "OPINION") {
    warnings.push("Entry đã verified nhưng claimStatus chưa an toàn cho AI.");
  }
  return warnings;
}
