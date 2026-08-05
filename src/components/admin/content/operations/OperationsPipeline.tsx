"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import type { OperationsPipelineColumnKey, OperationsPipelineSummaryEntry } from "@/features/content/operations/content-operations.types";

type OperationsPipelineProps = {
  entries: OperationsPipelineSummaryEntry[];
  activeColumn: OperationsPipelineColumnKey | undefined;
  onSelect: (column: OperationsPipelineColumnKey | undefined) => void;
};

/** Horizontal pipeline stage counts — click a stage to filter the board below. */
export default function OperationsPipeline({ entries, activeColumn, onSelect }: OperationsPipelineProps) {
  return (
    <div className={styles.pipelineRow} role="group" aria-label="Pipeline nội dung">
      {entries.map((entry) => {
        const isActive = activeColumn === entry.key;
        return (
          <button
            key={entry.key}
            type="button"
            className={`${styles.pipelineChip} ${isActive ? styles.pipelineChipActive : ""}`}
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? undefined : entry.key)}
          >
            <span className={styles.pipelineChipLabel}>{entry.label}</span>
            <span className={styles.pipelineChipCount}>{entry.count}</span>
          </button>
        );
      })}
    </div>
  );
}
