"use client";

import { useState } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";

export type ProposalContextChipsData = {
  factIds: string[];
  mediaIds: string[];
  linkIds: string[];
  brandRulesOn?: boolean;
  claimSafetyOn?: boolean;
};

type ChipId = "facts" | "media" | "links";

function truncate(id: string, len = 8): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

/**
 * Chips: Knowledge N · Media N · Internal Links N · Brand Rules ON ·
 * Claim Safety ON. Clicking Knowledge/Media/Links expands a short list of
 * (truncated) ids — never raw JSON.
 */
export default function ProposalContextChips({ data }: { data: ProposalContextChipsData }) {
  const [expanded, setExpanded] = useState<ChipId | null>(null);

  function toggle(id: ChipId) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <div className={styles.chipRow}>
        <button type="button" className={styles.chip} onClick={() => toggle("facts")} aria-expanded={expanded === "facts"}>
          Knowledge {data.factIds.length}
        </button>
        <button type="button" className={styles.chip} onClick={() => toggle("media")} aria-expanded={expanded === "media"}>
          Media {data.mediaIds.length}
        </button>
        <button type="button" className={styles.chip} onClick={() => toggle("links")} aria-expanded={expanded === "links"}>
          Internal Links {data.linkIds.length}
        </button>
        <span className={`${styles.chip} ${data.brandRulesOn ? styles.chipOk : styles.chipMissing}`}>
          Brand Rules {data.brandRulesOn ? "ON" : "OFF"}
        </span>
        <span className={`${styles.chip} ${data.claimSafetyOn ? styles.chipOk : styles.chipMissing}`}>
          Claim Safety {data.claimSafetyOn ? "ON" : "OFF"}
        </span>
      </div>

      {expanded === "facts" && (
        <p className={styles.chipExpanded}>
          {data.factIds.length ? data.factIds.map(truncate).join(", ") : "Không có fact nào được dùng."}
        </p>
      )}
      {expanded === "media" && (
        <p className={styles.chipExpanded}>
          {data.mediaIds.length ? data.mediaIds.map(truncate).join(", ") : "Không có media nào được dùng."}
        </p>
      )}
      {expanded === "links" && (
        <p className={styles.chipExpanded}>
          {data.linkIds.length ? data.linkIds.map(truncate).join(", ") : "Không có liên kết nào được dùng."}
        </p>
      )}
    </div>
  );
}
