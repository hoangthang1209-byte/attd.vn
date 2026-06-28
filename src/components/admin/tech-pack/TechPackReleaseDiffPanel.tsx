"use client";

import { useCallback, useEffect, useState } from "react";

type DiffItem = {
  section: string;
  type: "ADDED" | "REMOVED" | "CHANGED";
  label: string;
  before: string | null;
  after: string | null;
  severity: "info" | "warning";
};

type DiffResult = {
  hasPrevious: boolean;
  message: string | null;
  items: DiffItem[];
};

const SECTION_ORDER = ["BOM", "Artwork", "Thông số", "Rập", "Ghi chú"];

type Props = {
  techPackId: string;
};

export default function TechPackReleaseDiffPanel({ techPackId }: Props) {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tech-packs/${techPackId}/diff`);
      const data = (await res.json()) as DiffResult;
      if (res.ok) setDiff(data);
    } finally {
      setLoading(false);
    }
  }, [techPackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: (diff?.items ?? []).filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="tech-pack-release-diff">
      <h3 className="tech-pack-sidebar__title">Thay đổi so với bản phát hành trước</h3>
      {loading && <p className="admin-muted">Đang tải...</p>}
      {!loading && diff && !diff.hasPrevious && (
        <p className="admin-muted">{diff.message ?? "Chưa có bản phát hành trước để so sánh."}</p>
      )}
      {!loading && diff?.hasPrevious && diff.items.length === 0 && (
        <p className="admin-muted">{diff.message ?? "Không có thay đổi."}</p>
      )}
      {!loading && grouped.length > 0 && (
        <div className="tech-pack-release-diff__groups">
          {grouped.map((group) => (
            <div key={group.section} className="tech-pack-release-diff__group">
              <h4>{group.section}</h4>
              <ul>
                {group.items.map((item, index) => (
                  <li
                    key={`${item.type}-${item.label}-${index}`}
                    className={`tech-pack-release-diff__item tech-pack-release-diff__item--${item.type.toLowerCase()}`}
                  >
                    <span className="tech-pack-release-diff__label">{item.label}</span>
                    {item.type === "CHANGED" && (
                      <div className="tech-pack-release-diff__values">
                        <div>
                          <strong>Trước:</strong> {item.before ?? "—"}
                        </div>
                        <div>
                          <strong>Sau:</strong> {item.after ?? "—"}
                        </div>
                      </div>
                    )}
                    {item.type === "ADDED" && (
                      <div className="tech-pack-release-diff__values">
                        <div>
                          <strong>Sau:</strong> {item.after ?? "—"}
                        </div>
                      </div>
                    )}
                    {item.type === "REMOVED" && (
                      <div className="tech-pack-release-diff__values">
                        <div>
                          <strong>Trước:</strong> {item.before ?? "—"}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
