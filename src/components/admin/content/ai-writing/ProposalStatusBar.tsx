"use client";

import { useState } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";

export type ProposalStatusBarData = {
  provider: string;
  model: string;
  totalTokens?: number | null;
  generationTimeMs?: number | null;
  estimatedCostUsd?: number | null;
  factCount?: number;
  mediaCount?: number;
  linkCount?: number;
};

type Props = {
  data: ProposalStatusBarData;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

/**
 * Collapsed: "Provider · Model · Tokens". Expanded adds generation time,
 * cost (or "Chưa xác định" when unknown), and fact/media/link counts.
 * Never renders anything secret-shaped (no API keys, no raw provider
 * response bodies) — only the safe numeric/string fields passed in.
 */
export default function ProposalStatusBar({ data, defaultExpanded = false, onExpandedChange }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
  }

  const costLabel = data.estimatedCostUsd != null ? `$${data.estimatedCostUsd.toFixed(4)}` : "Chưa xác định";

  return (
    <div className={styles.statusBar}>
      <button type="button" className={styles.statusBarToggle} onClick={toggle} aria-expanded={expanded}>
        {data.provider} · {data.model} · {data.totalTokens ?? "—"} tokens {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div className={styles.statusBarDetails}>
          <span>
            <span className={styles.statusBarDetailLabel}>Thời gian: </span>
            {data.generationTimeMs != null ? `${data.generationTimeMs}ms` : "—"}
          </span>
          <span>
            <span className={styles.statusBarDetailLabel}>Chi phí: </span>
            {costLabel}
          </span>
          <span>
            <span className={styles.statusBarDetailLabel}>Facts: </span>
            {data.factCount ?? 0}
          </span>
          <span>
            <span className={styles.statusBarDetailLabel}>Media: </span>
            {data.mediaCount ?? 0}
          </span>
          <span>
            <span className={styles.statusBarDetailLabel}>Links: </span>
            {data.linkCount ?? 0}
          </span>
        </div>
      )}
    </div>
  );
}
