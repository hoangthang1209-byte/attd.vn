"use client";

import { useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { EmptyState } from "@/components/admin/AdminUi";
import type { ClusterNode } from "@/features/content/operations/content-operations.types";

type OperationsClustersProps = {
  clusters: ClusterNode[];
};

/** Expandable campaign → cluster tree with topic counts (display-only). */
export default function OperationsClusters({ clusters }: OperationsClustersProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (clusters.length === 0) {
    return <EmptyState compact title="Chưa có cụm chủ đề" description="Chưa có chiến lược nào có cụm chủ đề đang hoạt động." />;
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.clusterTree}>
      {clusters.map((node) => {
        const isOpen = expanded.has(node.campaignId);
        return (
          <div key={node.campaignId} className={styles.clusterCampaign}>
            <button
              type="button"
              className={styles.clusterCampaignHeader}
              onClick={() => toggle(node.campaignId)}
              aria-expanded={isOpen}
            >
              <span>
                {isOpen ? "▾" : "▸"} {node.campaignName}
              </span>
              <span className="admin-field-hint" style={{ margin: 0 }}>
                {node.total} chủ đề · {node.clusters.length} cụm
              </span>
            </button>
            {isOpen ? (
              <div className={styles.clusterList}>
                {node.clusters.map((leaf) => (
                  <div key={leaf.clusterId} className={styles.clusterRow}>
                    <span>{leaf.clusterName}</span>
                    <span className="admin-field-hint" style={{ margin: 0 }}>
                      {leaf.total} chủ đề
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
