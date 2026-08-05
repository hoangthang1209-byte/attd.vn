"use client";

import Link from "next/link";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { EmptyState } from "@/components/admin/AdminUi";
import type { CampaignHealth } from "@/features/content/operations/content-operations.types";

type OperationsCampaignsProps = {
  campaigns: CampaignHealth[];
};

/** Campaign (strategy) publish progress — links to the existing Strategy detail page. */
export default function OperationsCampaigns({ campaigns }: OperationsCampaignsProps) {
  if (campaigns.length === 0) {
    return <EmptyState compact title="Chưa có chiến lược" description="Chưa có chiến lược nào có chủ đề đang hoạt động." />;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href={`/admin/content/seo-strategies/${campaign.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
              <strong>{campaign.name}</strong>
              <span className="admin-field-hint" style={{ margin: 0 }}>
                {campaign.progressPercent}% · {campaign.publishedCount}/{campaign.total} đã xuất bản
                {campaign.overdueCount > 0 ? ` · ${campaign.overdueCount} quá hạn` : ""}
              </span>
            </div>
            <div className={styles.miniProgressTrack}>
              <div className={styles.miniProgressFill} style={{ width: `${campaign.progressPercent}%` }} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
