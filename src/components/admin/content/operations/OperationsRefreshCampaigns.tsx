"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { REFRESH_REASON_LABELS, buildRefreshCampaigns } from "@/features/content/operations/content-operations.mapping";
import type { RefreshCampaign, RefreshInbox } from "@/features/content/operations/content-operations.types";

/** Refresh workload rolled up by campaign. Fetches its own refresh inbox on mount (lazy, section-scoped). */
export default function OperationsRefreshCampaigns() {
  const [campaigns, setCampaigns] = useState<RefreshCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setCampaigns(null);
    try {
      const res = await fetch("/api/content/operations/refresh", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: RefreshInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được chiến dịch cần làm mới");
      setCampaigns(buildRefreshCampaigns(json.inbox.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được chiến dịch cần làm mới");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (campaigns === null && !error) return <AdminLoadingState label="Đang tải chiến dịch cần làm mới…" rows={3} />;
  if (error) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được chiến dịch cần làm mới"
        description={error}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }
  if (!campaigns || campaigns.length === 0) {
    return <EmptyState compact title="Không có chiến dịch cần làm mới" description="Chưa có bài xuất bản nào cần làm mới." />;
  }

  return (
    <div className={styles.rowsTable}>
      <div className={styles.rowsHeader}>
        <span>Chiến dịch</span>
        <span>Số bài</span>
        <span>Lý do phổ biến</span>
        <span></span>
      </div>
      {campaigns.map((campaign) => {
        const topReason = Object.entries(campaign.reasonCounts).sort((a, b) => b[1] - a[1])[0];
        return (
          <div key={campaign.campaignId} className={styles.rowItem}>
            <div className={styles.rowName}>{campaign.campaign}</div>
            <span>{campaign.total}</span>
            <span>
              {topReason ? `${REFRESH_REASON_LABELS[topReason[0] as keyof typeof REFRESH_REASON_LABELS]} (${topReason[1]})` : "—"}
            </span>
            <span></span>
          </div>
        );
      })}
    </div>
  );
}
