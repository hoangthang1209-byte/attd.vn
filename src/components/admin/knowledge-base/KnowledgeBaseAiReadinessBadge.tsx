"use client";

import type { AiReadinessResult } from "@/features/knowledge-base/knowledge-base-ai-readiness";

type Props = {
  readiness: Pick<AiReadinessResult, "score" | "level" | "label">;
  showScore?: boolean;
};

const LEVEL_CLASS: Record<string, string> = {
  LOW: "admin-kb-badge--ai-low",
  MEDIUM: "admin-kb-badge--ai-medium",
  HIGH: "admin-kb-badge--ai-high",
  VERIFIED: "admin-kb-badge--ai-verified",
};

export default function KnowledgeBaseAiReadinessBadge({ readiness, showScore = true }: Props) {
  const levelClass = LEVEL_CLASS[readiness.level] ?? "admin-kb-badge--ai-low";
  return (
    <span
      className={`admin-kb-badge admin-kb-badge--ai ${levelClass}`}
      title={`Điểm sẵn sàng AI: ${readiness.score}/100`}
    >
      {showScore ? `${readiness.score} — ` : ""}
      {readiness.label}
    </span>
  );
}
