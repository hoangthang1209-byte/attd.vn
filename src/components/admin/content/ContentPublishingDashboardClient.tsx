"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  AdminLoadingState,
  DataToolbar,
  EmptyState,
  WorkspaceToolbarEnd,
} from "@/components/admin/AdminUi";

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
    void load();
  }, [load]);

  const allQueuesEmpty = useMemo(() => {
    if (!queues) return false;
    return Object.values(queues).every((rows) => (rows?.length ?? 0) === 0);
  }, [queues]);

  function list(title: string, rows: unknown[] | undefined) {
    return (
      <div className="admin-sidebar-card">
        <h3>{title}</h3>
        <ul style={{ fontSize: 13, paddingLeft: 16 }}>
          {(rows ?? []).slice(0, 12).map((row, i) => {
            const r = row as Record<string, unknown>;
            const id = String(r.id ?? i);
            const titleText = String(r.title ?? r.action ?? id);
            return (
              <li key={id}>
                {r.blogPostId || r.slug ? (
                  <Link href={r.slug ? `/admin/blog/${r.id}` : `/admin/blog/${r.blogPostId}`}>
                    {titleText}
                  </Link>
                ) : (
                  titleText
                )}{" "}
                · {String(r.status ?? "")}
                {r.scheduledAt
                  ? ` · ${new Date(String(r.scheduledAt)).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}`
                  : ""}
              </li>
            );
          })}
          {(rows ?? []).length === 0 && <li className="admin-field-hint">Trống</li>}
        </ul>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <DataToolbar data-testid="content-publishing-toolbar">
        <p className="admin-field-hint" style={{ margin: 0, flex: "1 1 240px" }}>
          Queue publish/schedule/fail. Không auto-publish từ AI.
        </p>
        <WorkspaceToolbarEnd>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
            Refresh
          </button>
        </WorkspaceToolbarEnd>
      </DataToolbar>

      {loading ? (
        <AdminLoadingState label="Đang tải hàng đợi xuất bản…" rows={3} />
      ) : error ? (
        <EmptyState
          tone="error"
          title="Không tải được dashboard xuất bản"
          description={error}
          action={
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : queues && allQueuesEmpty ? (
        <EmptyState
          title="Không có nội dung trong hàng đợi xuất bản"
          description="Khi có bài sẵn sàng publish/schedule hoặc lỗi xuất bản, các hàng đợi sẽ hiển thị tại đây."
        />
      ) : queues ? (
        <>
          {list("Ready / Draft governed", queues.ready)}
          {list("Scheduled", queues.scheduled)}
          {list("Publishing failures", queues.failed)}
          {list("Recently published", queues.recent)}
          {list("Modified after handoff", queues.modified)}
        </>
      ) : null}
    </div>
  );
}
