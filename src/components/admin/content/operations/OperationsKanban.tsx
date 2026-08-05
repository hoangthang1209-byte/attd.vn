"use client";

import Link from "next/link";
import { useCallback } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { OPERATIONS_PIPELINE_COLUMNS } from "@/features/content/operations/content-operations.types";
import type { OperationsPipelineColumnKey, OpsTopicCard } from "@/features/content/operations/content-operations.types";
import { SEO_TOPIC_PRIORITY_LABELS } from "@/features/content/seo/seo-labels";

const RENDER_CAP_PER_COLUMN = 40;

type OperationsKanbanProps = {
  kanban: Record<OperationsPipelineColumnKey, OpsTopicCard[]>;
};

function KanbanCard({ card, onDragAttempt }: { card: OpsTopicCard; onDragAttempt: () => void }) {
  const activeFlags = [
    card.flags.overdue ? "Quá hạn" : null,
    card.flags.missingCta ? "CTA" : null,
    card.flags.missingMeta ? "Meta" : null,
    card.flags.missingMedia ? "Hình" : null,
    card.flags.missingFaq ? "FAQ" : null,
    card.flags.needsRefresh ? "Làm mới" : null,
  ].filter((flag): flag is string => flag !== null);

  return (
    <Link
      href={card.href}
      className={styles.card}
      draggable
      onDragStart={(e) => {
        // Drag is a visual placeholder only in this sprint — no status transition.
        e.preventDefault();
        onDragAttempt();
      }}
    >
      <div className={styles.cardTitle}>{card.title}</div>
      <div className={styles.cardMeta}>
        <span>{card.owner ?? "Chưa gán"}</span>
        <span>·</span>
        <span>{SEO_TOPIC_PRIORITY_LABELS[card.priority]}</span>
        {card.blocked ? (
          <>
            <span>·</span>
            <span>Tạm dừng/Từ chối</span>
          </>
        ) : null}
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${card.progressPercent}%` }} />
      </div>
      {activeFlags.length > 0 ? (
        <div className={styles.cardFlags}>
          {activeFlags.map((flag) => (
            <span
              key={flag}
              className={`${styles.flagBadge} ${flag === "Quá hạn" ? styles.flagBadgeOverdue : ""}`}
            >
              {flag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

/**
 * Kanban board over the current filtered set. Drag is a cursor-grab
 * placeholder only — it never calls a status-transition API. Sprint 17.0 is
 * read-only over Topic/Brief/Writing/Review/Publish state.
 */
export default function OperationsKanban({ kanban }: OperationsKanbanProps) {
  const toast = useAdminToast();
  const handleDragAttempt = useCallback(() => {
    toast.info("Kéo thả chưa đổi trạng thái trong sprint này");
  }, [toast]);

  return (
    <div className={styles.kanbanBoard} role="list" aria-label="Bảng Kanban vận hành nội dung">
      {OPERATIONS_PIPELINE_COLUMNS.map((col) => {
        const cards = kanban[col.key] ?? [];
        const visible = cards.slice(0, RENDER_CAP_PER_COLUMN);
        const hidden = cards.length - visible.length;
        return (
          <div key={col.key} className={styles.kanbanColumn} role="listitem" aria-label={col.label}>
            <div className={styles.kanbanColumnHeader}>
              <span>{col.label}</span>
              <span className={styles.kanbanColumnCount}>{cards.length}</span>
            </div>
            <div className={styles.kanbanList}>
              {visible.length === 0 ? (
                <p className="admin-field-hint" style={{ margin: 0 }}>
                  Trống
                </p>
              ) : (
                visible.map((card) => (
                  <KanbanCard key={card.id} card={card} onDragAttempt={handleDragAttempt} />
                ))
              )}
            </div>
            {hidden > 0 ? <div className={styles.kanbanMore}>còn {hidden}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
