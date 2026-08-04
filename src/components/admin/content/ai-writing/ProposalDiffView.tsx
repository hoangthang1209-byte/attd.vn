"use client";

import { useMemo, useState } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import { computeLineDiff } from "@/features/content-generation/ux/text-diff";

type Tab = "diff" | "original" | "proposal";

type Props = {
  originalText: string;
  proposalText: string;
  label?: string;
};

/**
 * Tabs: Diff (default) | Original | Proposal. Insert = muted green,
 * delete = muted red (strikethrough), change = muted amber — chosen for
 * contrast without leaning on hue alone (strikethrough + background).
 */
export default function ProposalDiffView({ originalText, proposalText, label = "So sánh đề xuất AI" }: Props) {
  const [tab, setTab] = useState<Tab>("diff");
  const diff = useMemo(() => computeLineDiff(originalText, proposalText), [originalText, proposalText]);

  return (
    <div role="region" aria-label={label}>
      <div className={styles.diffTabs} role="tablist" aria-label="Chế độ xem">
        {(
          [
            ["diff", "Diff"],
            ["original", "Bản gốc"],
            ["proposal", "Đề xuất"],
          ] as Array<[Tab, string]>
        ).map(([id, tabLabel]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`${styles.diffTab} ${tab === id ? styles.diffTabActive : ""}`}
            onClick={() => setTab(id)}
          >
            {tabLabel}
          </button>
        ))}
      </div>

      <div className={styles.diffBody}>
        {tab === "original" && (originalText.trim() || <em>Chưa có nội dung.</em>)}
        {tab === "proposal" && (proposalText.trim() || <em>Đề xuất trống.</em>)}
        {tab === "diff" &&
          (diff.length === 0 ? (
            <em>Không có khác biệt.</em>
          ) : (
            diff.map((line, idx) => {
              if (line.type === "equal") {
                return (
                  <div key={idx} className={`${styles.diffLine} ${styles.diffLineEqual}`}>
                    {line.originalText || "\u00A0"}
                  </div>
                );
              }
              if (line.type === "insert") {
                return (
                  <div key={idx} className={`${styles.diffLine} ${styles.diffLineInsert}`}>
                    + {line.proposalText}
                  </div>
                );
              }
              if (line.type === "delete") {
                return (
                  <div key={idx} className={`${styles.diffLine} ${styles.diffLineDelete}`}>
                    − {line.originalText}
                  </div>
                );
              }
              return (
                <div key={idx}>
                  <div className={`${styles.diffLine} ${styles.diffLineChangeOld}`}>− {line.originalText}</div>
                  <div className={`${styles.diffLine} ${styles.diffLineChangeNew}`}>+ {line.proposalText}</div>
                </div>
              );
            })
          ))}
      </div>
    </div>
  );
}
