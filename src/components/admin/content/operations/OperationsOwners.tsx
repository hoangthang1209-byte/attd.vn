"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import { EmptyState } from "@/components/admin/AdminUi";
import type { OwnerWorkload } from "@/features/content/operations/content-operations.types";

type OperationsOwnersProps = {
  owners: OwnerWorkload[];
};

/** Workload per assigned editor — overdue/blocked counts surfaced, no reassignment here. */
export default function OperationsOwners({ owners }: OperationsOwnersProps) {
  if (owners.length === 0) {
    return <EmptyState compact title="Chưa có dữ liệu owner" description="Chưa có chủ đề nào được gán người phụ trách." />;
  }
  const maxTotal = Math.max(...owners.map((o) => o.total), 1);
  return (
    <div className={styles.rowsTable}>
      <div className={styles.rowsHeader}>
        <span>Người phụ trách</span>
        <span>Tổng</span>
        <span>Quá hạn</span>
        <span>Tạm dừng</span>
      </div>
      {owners.map((owner) => (
        <div key={owner.owner} className={styles.rowItem}>
          <div>
            <div className={styles.rowName}>{owner.owner}</div>
            <div className={styles.miniProgressTrack}>
              <div className={styles.miniProgressFill} style={{ width: `${Math.round((owner.total / maxTotal) * 100)}%` }} />
            </div>
          </div>
          <span>{owner.total}</span>
          <span>{owner.overdueCount}</span>
          <span>{owner.blockedCount}</span>
        </div>
      ))}
    </div>
  );
}
