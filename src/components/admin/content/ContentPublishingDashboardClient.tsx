"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

export default function ContentPublishingDashboardClient() {
  const toast = useAdminToast();
  const [queues, setQueues] = useState<Record<string, unknown[]> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/content/publishing");
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? "Load failed");
      return;
    }
    setQueues(json.queues as Record<string, unknown[]>);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function list(title: string, rows: unknown[] | undefined) {
    return (
      <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
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
    <div className="admin-page">
      <p className="admin-field-hint">
        Queue publish/schedule/fail. Không auto-publish từ AI.{" "}
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
          Refresh
        </button>
      </p>
      {queues && (
        <>
          {list("Ready / Draft governed", queues.ready)}
          {list("Scheduled", queues.scheduled)}
          {list("Publishing failures", queues.failed)}
          {list("Recently published", queues.recent)}
          {list("Modified after handoff", queues.modified)}
        </>
      )}
    </div>
  );
}
