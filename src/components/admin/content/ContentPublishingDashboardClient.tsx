"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  AdminLoadingState,
  DataToolbar,
  EmptyState,
  StatusBadge,
  WorkspaceToolbarEnd,
} from "@/components/admin/AdminUi";
import { CONTENT_STATUS_COLORS } from "@/features/content/editorial/editorial-ux";

type QueueKey = "ready" | "scheduled" | "failed" | "recent" | "modified";

const QUEUE_META: Record<
  QueueKey,
  { title: string; description: string; tone: keyof typeof CONTENT_STATUS_COLORS; primaryLabel: string }
> = {
  ready: {
    title: "Bản nháp",
    description: "Bài đã sẵn sàng để xuất bản thủ công.",
    tone: "draft",
    primaryLabel: "Xuất bản",
  },
  scheduled: {
    title: "Đã lên lịch",
    description: "Bài sẽ đăng theo lịch đã xác nhận.",
    tone: "scheduled",
    primaryLabel: "Xem lịch",
  },
  recent: {
    title: "Đã xuất bản",
    description: "Bài vừa đăng gần đây.",
    tone: "published",
    primaryLabel: "Xem bài",
  },
  failed: {
    title: "Xuất bản lỗi",
    description: "Cần xử lý trước khi đăng lại.",
    tone: "blocked",
    primaryLabel: "Xử lý lỗi",
  },
  modified: {
    title: "Đã chỉnh sau bàn giao",
    description: "Nội dung thay đổi sau khi tạo bản nháp Blog.",
    tone: "needsReview",
    primaryLabel: "Xem lại",
  },
};

export default function ContentPublishingDashboardClient() {
  const toast = useAdminToast();
  const [queues, setQueues] = useState<Record<string, unknown[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/publishing");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Load failed");
      }
      setQueues(json.queues as Record<string, unknown[]>);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const allQueuesEmpty = useMemo(() => {
    if (!queues) return false;
    return Object.values(queues).every((rows) => (rows?.length ?? 0) === 0);
  }, [queues]);

  function renderQueue(key: QueueKey) {
    const meta = QUEUE_META[key];
    const rows = (queues?.[key] ?? []) as Array<Record<string, unknown>>;
    const tone = CONTENT_STATUS_COLORS[meta.tone];
    return (
      <section className="admin-sidebar-card" style={{ margin: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>{meta.title}</h3>
            <p className="admin-field-hint" style={{ margin: "4px 0 0" }}>
              {meta.description}
            </p>
          </div>
          <StatusBadge tone={meta.tone === "blocked" ? "danger" : meta.tone === "published" ? "success" : "info"}>
            {rows.length}
          </StatusBadge>
        </div>
        {rows.length === 0 ? (
          <p className="admin-field-hint">Không có mục trong hàng đợi này.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {rows.slice(0, 12).map((row, i) => {
              const id = String(row.id ?? i);
              const titleText = String(row.title ?? row.action ?? id);
              const href = row.slug
                ? `/admin/blog/${row.id}`
                : row.blogPostId
                  ? `/admin/blog/${row.blogPostId}`
                  : null;
              return (
                <article
                  key={id}
                  style={{
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <strong style={{ color: tone.fg }}>{titleText}</strong>
                  <span className="admin-field-hint">
                    {String(row.status ?? "")}
                    {row.scheduledAt
                      ? ` · ${new Date(String(row.scheduledAt)).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })}`
                      : ""}
                  </span>
                  <div>
                    {href ? (
                      <Link href={href} className="admin-btn admin-btn--primary admin-btn--small">
                        {meta.primaryLabel}
                      </Link>
                    ) : (
                      <span className="admin-field-hint">Không có liên kết Blog</span>
                    )}
                    {href ? (
                      <Link
                        href={href}
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        style={{ marginLeft: 8 }}
                      >
                        Xem trước
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="admin-panel">
      <DataToolbar data-testid="content-publishing-toolbar">
        <p className="admin-field-hint" style={{ margin: 0, flex: "1 1 240px" }}>
          Workspace xuất bản — Bản nháp / Đã lên lịch / Đã xuất bản / Lỗi. Không tự đăng từ AI.
        </p>
        <WorkspaceToolbarEnd>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
            Làm mới
          </button>
        </WorkspaceToolbarEnd>
      </DataToolbar>

      {loading ? (
        <AdminLoadingState label="Đang tải hàng đợi xuất bản…" rows={3} />
      ) : error ? (
        <EmptyState
          tone="error"
          title="Không tải được workspace xuất bản"
          description={error}
          action={
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : queues && allQueuesEmpty ? (
        <EmptyState
          title="Chưa có bài trong hàng đợi xuất bản"
          description="Khi có bài sẵn sàng đăng, đã lên lịch, hoặc lỗi xuất bản, các thẻ sẽ xuất hiện tại đây."
          action={
            <Link href="/admin/content/seo" className="admin-btn admin-btn--primary">
              Về Content Dashboard
            </Link>
          }
        />
      ) : queues ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {renderQueue("ready")}
          {renderQueue("scheduled")}
          {renderQueue("recent")}
          {renderQueue("failed")}
          {renderQueue("modified")}
        </div>
      ) : null}
    </div>
  );
}
