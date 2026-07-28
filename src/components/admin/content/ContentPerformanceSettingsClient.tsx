"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  fetchDashboardJson,
  sectionFromFetchResult,
  type SectionLoadState,
} from "@/features/content/editorial/dashboard-fetch";
import type {
  PerformanceFreshness,
  PerformanceSourceReport,
  PerformanceSourceStatus,
} from "@/features/content/performance/content-performance.types";

const SOURCE_STATUS_LABELS: Record<PerformanceSourceStatus, string> = {
  CONNECTED: "Đã kết nối",
  NOT_CONNECTED: "Chưa kết nối",
  PARTIAL: "Một phần",
  ERROR: "Lỗi",
};

const FRESHNESS_LABELS: Record<PerformanceFreshness, string> = {
  FRESH: "Mới",
  DELAYED: "Chậm",
  STALE: "Cũ",
  UNAVAILABLE: "Không có",
};

function statusTone(
  status: PerformanceSourceStatus,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "CONNECTED") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "ERROR") return "danger";
  return "neutral";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export default function ContentPerformanceSettingsClient() {
  const [state, setState] = useState<SectionLoadState<PerformanceSourceReport[]>>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    setState({ status: "loading" });
    const result = await fetchDashboardJson("/api/content/performance/settings", {
      signal,
      validate: (json) => {
        const body = json as { sources?: PerformanceSourceReport[]; message?: string };
        if (!Array.isArray(body.sources)) {
          throw new Error(body.message ?? "Thiếu danh sách nguồn đo lường.");
        }
        return body.sources;
      },
    });
    if (signal.aborted) return;
    setState(sectionFromFetchResult(result, (rows) => rows.length === 0));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadToken]);

  const sources =
    state.status === "ready" ? state.data : state.status === "empty" ? [] : null;

  return (
    <>
      <AdminPageTitle title="Cài đặt nguồn đo lường" />
      <div className="admin-panel">
        <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Trạng thái kết nối Search Console, Analytics và attribution. Không hiển thị
              credential hoặc secret.
            </p>
            <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
              Hướng dẫn vận hành:{" "}
              <code>docs/operations/content-performance.md</code>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/content/performance" className="admin-btn admin-btn--secondary">
              Quay lại hiệu quả
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setReloadToken((n) => n + 1)}
            >
              Tải lại
            </button>
          </div>
        </div>

        {state.status === "loading" ? (
          <TableLoading
            title="Đang tải cài đặt nguồn…"
            description="Đang đọc trạng thái kết nối."
            tone="admin"
          />
        ) : null}

        {state.status === "error" ? (
          <EmptyState
            tone="error"
            title="Không tải được cài đặt nguồn"
            description={state.message}
            action={
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => setReloadToken((n) => n + 1)}
              >
                Thử lại
              </button>
            }
          />
        ) : null}

        {sources && sources.length === 0 ? (
          <EmptyState
            title="Chưa có nguồn đo lường"
            description="Hệ thống chưa báo cáo nguồn nào."
          />
        ) : null}

        {sources && sources.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {sources.map((source) => (
              <article key={source.id} className="admin-sidebar-card" style={{ margin: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h3 style={{ margin: 0 }}>{source.label}</h3>
                  <StatusBadge tone={statusTone(source.status)}>
                    {SOURCE_STATUS_LABELS[source.status]}
                  </StatusBadge>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Property: {source.propertyIdentifier ?? "—"}
                  </p>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Độ phủ: {source.dataCoverage}
                  </p>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Freshness: {FRESHNESS_LABELS[source.freshness]}
                  </p>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Thành công gần nhất: {formatDateTime(source.lastSuccessAt)}
                  </p>
                  {source.lastErrorSummary ? (
                    <p className="admin-message admin-message--warning" style={{ margin: 0 }}>
                      Lỗi gần nhất: {source.lastErrorSummary}
                    </p>
                  ) : (
                    <p className="admin-field-hint" style={{ margin: 0 }}>
                      Lỗi gần nhất: —
                    </p>
                  )}
                  {source.notes.length > 0 ? (
                    <ul className="admin-field-hint" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                      {source.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
