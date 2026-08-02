"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import type { PhotographerWorkflowLane } from "@/features/media/intelligence/dashboard.service";

const LANE_LABELS: Record<PhotographerWorkflowLane, string> = {
  incoming: "Incoming Assets",
  waiting_review: "Waiting Review",
  needs_metadata: "Needs Metadata",
  ready: "Ready",
  published: "Published",
};

const LANE_HINTS: Record<PhotographerWorkflowLane, string> = {
  incoming: "Mới upload / đang xử lý metadata",
  waiting_review: "Đã có gợi ý — editor xác nhận",
  needs_metadata: "Thiếu title hoặc alt",
  ready: "SEO sẵn sàng (PUBLIC hoặc INTERNAL)",
  published: "PUBLIC + SEO sẵn sàng",
};

export default function MediaInboxClient() {
  const [lanes, setLanes] = useState<Record<PhotographerWorkflowLane, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/media/intelligence/workflow");
        const json = (await res.json()) as {
          lanes?: Record<PhotographerWorkflowLane, number>;
          message?: string;
        };
        if (!res.ok) throw new Error(json.message || "Không tải được workflow");
        if (!cancelled) setLanes(json.lanes ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <AdminPageTitle title="Incoming Assets" />
      <p style={{ marginTop: 0, color: "#6b7280", maxWidth: 640 }}>
        Photographer upload → hệ thống sinh metadata → editor review. Không auto-publish.
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/admin/media" className="admin-btn admin-btn--secondary">
          Thư viện
        </Link>
        <Link href="/admin/media/dashboard" className="admin-btn admin-btn--secondary">
          Dashboard
        </Link>
      </div>

      {loading ? <InlineLoading title="Đang tải..." /> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {lanes ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {(Object.keys(LANE_LABELS) as PhotographerWorkflowLane[]).map((lane) => (
            <Link
              key={lane}
              href={`/admin/media?workflowLane=${lane}`}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{LANE_LABELS[lane]}</div>
              <div style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>{lanes[lane]}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{LANE_HINTS[lane]}</div>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
