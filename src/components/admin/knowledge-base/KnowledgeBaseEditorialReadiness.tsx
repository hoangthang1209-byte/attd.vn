"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { KnowledgeHealthScore } from "@/features/knowledge-base/knowledge-base-health.service";

type ChecklistItem = {
  label: string;
  value: number | string;
  filter?: string;
};

export default function KnowledgeBaseEditorialReadiness() {
  const [health, setHealth] = useState<KnowledgeHealthScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/health")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Không tải được health");
        setHealth(data.health as KnowledgeHealthScore);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi health"));
  }, []);

  if (error) {
    return <p className="admin-error">{error}</p>;
  }
  if (!health) {
    return <p className="admin-field-hint">Đang tải checklist biên tập…</p>;
  }

  const c = health.editorialChecklist;
  const items: ChecklistItem[] = [
    { label: "Public đã phê duyệt", value: c.publicApproved, filter: "approved" },
    {
      label: "Public verified legacy (chưa approve)",
      value: c.publicVerifiedLegacy,
      filter: "unapproved",
    },
    { label: "Thiếu nguồn", value: c.missingSource, filter: "missing_source" },
    { label: "Thiếu bằng chứng", value: c.missingEvidence, filter: "needs_evidence" },
    { label: "Không có domain", value: c.withoutDomain },
    { label: "Chưa liên kết Product", value: c.withoutProduct, filter: "missing_product" },
    { label: "Chưa liên kết Media Bundle", value: c.withoutBundle, filter: "missing_bundle" },
    { label: "Chưa liên kết SEO Topic", value: c.withoutSeoTopic, filter: "missing_seo_topic" },
    { label: "Cần rà soát", value: c.reviewDue, filter: "review_due" },
    { label: "Hết hiệu lực", value: c.expired, filter: "review_overdue" },
    {
      label: "Retrieval-ready SEO_BRIEF",
      value: health.retrievalReadiness.retrievalEligibleByConsumer.SEO_BRIEF ?? 0,
      filter: "public",
    },
  ];

  return (
    <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
      <h3 className="admin-sidebar-title">Sẵn sàng biên tập SEO</h3>
      <p className="admin-field-hint">
        Checklist thực từ Knowledge Health — dùng để chuẩn hóa trước khi AI tạo Brief.
      </p>
      <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13 }}>
        {items.map((item) => (
          <li key={item.label} style={{ marginBottom: 4 }}>
            {item.label}: <strong>{item.value}</strong>
            {item.filter ? (
              <>
                {" · "}
                <Link href={`/admin/knowledge-base?governanceFilter=${item.filter}`}>
                  Xem
                </Link>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <Link
        href="/admin/knowledge-base?governanceFilter=unapproved"
        className="admin-btn admin-btn--secondary admin-btn--small"
      >
        Xem các mục cần chuẩn hóa
      </Link>
      {health.warnings.length > 0 && (
        <ul className="admin-field-hint" style={{ marginTop: 8 }}>
          {health.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
