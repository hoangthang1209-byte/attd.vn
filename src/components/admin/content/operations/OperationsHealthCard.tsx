"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import type { HealthMetric } from "@/features/content/operations/content-operations.types";

type OperationsHealthCardProps = {
  metrics: HealthMetric[];
  activeFilter: string | null;
  onSelect: (hrefFilter: string) => void;
};

/** Executive health metrics grid — click a card to filter the topic list by that gap. */
export default function OperationsHealthCard({ metrics, activeFilter, onSelect }: OperationsHealthCardProps) {
  return (
    <div className={styles.healthGrid} role="group" aria-label="Sức khỏe nội dung">
      {metrics.map((metric) => {
        const clickable = Boolean(metric.hrefFilter);
        const isActive = clickable && activeFilter === metric.hrefFilter;
        return (
          <button
            key={metric.id}
            type="button"
            className={`${styles.healthCard} ${isActive ? styles.healthCardActive : ""}`}
            disabled={!clickable}
            aria-pressed={clickable ? isActive : undefined}
            onClick={() => metric.hrefFilter && onSelect(metric.hrefFilter)}
            style={!clickable ? { cursor: "default" } : undefined}
          >
            <div className={styles.healthCount}>{metric.count}</div>
            <div className={styles.healthLabel}>{metric.label}</div>
          </button>
        );
      })}
    </div>
  );
}
