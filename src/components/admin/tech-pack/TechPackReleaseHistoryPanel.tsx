"use client";

import { useCallback, useEffect, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import { TECH_PACK_RELEASE_ACTION_LABELS } from "@/features/tech-pack/tech-pack-bom-labels";
import type { TechPackReleaseAction } from "@prisma/client";

type HistoryItem = {
  id: string;
  version: number;
  action: TechPackReleaseAction;
  actorName: string | null;
  createdAt: string;
};

type Props = {
  techPackId: string;
};

export default function TechPackReleaseHistoryPanel({ techPackId }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tech-packs/${techPackId}/release-history`);
      const data = (await res.json()) as { items?: HistoryItem[] };
      if (res.ok) setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [techPackId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="tech-pack-release-history">
      <h3 className="tech-pack-sidebar__title">Lịch sử phát hành</h3>
      {loading && <AdminInlineLoader message="Đang tải lịch sử phát hành…" />}
      {!loading && items.length === 0 && <p className="admin-muted">Chưa có lịch sử.</p>}
      <ul className="tech-pack-release-history__timeline">
        {items.map((item) => (
          <li key={item.id} className="tech-pack-release-history__item">
            <div className="tech-pack-release-history__action">
              {TECH_PACK_RELEASE_ACTION_LABELS[item.action] ?? item.action}
            </div>
            <div className="tech-pack-release-history__meta">
              <span>v{item.version}</span>
              <span>·</span>
              <span>{item.actorName ?? "Hệ thống"}</span>
            </div>
            <time className="tech-pack-release-history__time">
              {new Date(item.createdAt).toLocaleString("vi-VN")}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
