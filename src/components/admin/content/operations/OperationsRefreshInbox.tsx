"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { REFRESH_REASON_LABELS } from "@/features/content/operations/content-operations.mapping";
import type { RefreshInbox, RefreshInboxCard } from "@/features/content/operations/content-operations.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function RefreshInboxRow({ card }: { card: RefreshInboxCard }) {
  return (
    <div className={styles.inboxRow}>
      <div className={styles.inboxRowMain}>
        <div className={styles.inboxRowTitle}>{card.title}</div>
        <div className={styles.inboxRowMeta}>
          <span>{card.owner ?? "Chưa gán"}</span>
          <span>·</span>
          <span>{card.campaign}</span>
          <span>·</span>
          <span>Xuất bản {formatDate(card.publishedAt)}</span>
          {card.ageDays != null ? <span>({card.ageDays} ngày)</span> : null}
        </div>
        <div className={styles.cardFlags}>
          {card.reasons.map((reason) => (
            <span key={reason} className={styles.flagBadge}>
              {REFRESH_REASON_LABELS[reason]}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Mức độ</span>
        <span>{card.severity}</span>
      </div>
      <div className={styles.inboxRowActions}>
        <Link href={card.href} className="admin-btn admin-btn--secondary admin-btn--small">
          Mở chủ đề
        </Link>
      </div>
    </div>
  );
}

function matchesQuery(card: RefreshInboxCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return card.title.toLowerCase().includes(q) || card.campaign.toLowerCase().includes(q) || (card.owner ?? "").toLowerCase().includes(q);
}

type OperationsRefreshInboxProps = {
  searchQuery?: string;
};

/**
 * Refresh inbox — reasons chips (machine-readable keys localized via
 * REFRESH_REASON_LABELS), severity-sorted. Fetches
 * `GET /api/content/operations/refresh` on mount; link-only, never edits.
 */
export default function OperationsRefreshInbox({ searchQuery = "" }: OperationsRefreshInboxProps) {
  const toast = useAdminToast();
  const [inbox, setInbox] = useState<RefreshInbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/operations/refresh", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: RefreshInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được hàng đợi làm mới");
      setInbox(json.inbox);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải được hàng đợi làm mới";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <AdminLoadingState label="Đang tải hàng đợi làm mới…" rows={4} />;
  if (error || !inbox) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được hàng đợi làm mới"
        description={error ?? "Không có dữ liệu"}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }

  if (inbox.items.length === 0) {
    return <EmptyState compact title="Không có bài cần làm mới" description="Tất cả bài đã xuất bản đều đạt tiêu chí biên tập hiện tại." />;
  }

  const filteredItems = inbox.items.filter((card) => matchesQuery(card, searchQuery));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          {filteredItems.length} / {inbox.items.length} bài cần làm mới — sắp xếp theo mức độ nghiêm trọng
        </span>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
          Tải lại
        </button>
      </div>
      <div className={styles.inboxList}>
        {filteredItems.map((card) => (
          <RefreshInboxRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
