"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  fetchDashboardJson,
  sectionFromFetchResult,
  type SectionLoadState,
} from "@/features/content/editorial/dashboard-fetch";
import type {
  ContentPerformanceSummary,
  ContentRefreshStatus,
  PerformanceOpportunity,
  PerformanceOpportunityKind,
  PerformanceSourceStatus,
  PerformanceWorkspaceSummary,
} from "@/features/content/performance/content-performance.types";
import {
  OPPORTUNITY_KIND_LABELS,
  REFRESH_STATUS_LABELS,
} from "@/features/content/performance/content-performance.types";

const RANGE_OPTIONS = [
  { value: "7", label: "7 ngày" },
  { value: "28", label: "28 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "custom", label: "Tùy chọn" },
] as const;

const OPPORTUNITY_KIND_VI: Record<PerformanceOpportunityKind, string> = {
  quick_wins: "Cơ hội nhanh",
  ctr_improvement: "Cải thiện CTR",
  ranking_improvement: "Cải thiện thứ hạng",
  conversion_improvement: "Cải thiện chuyển đổi",
  content_refresh: "Làm mới nội dung",
  internal_linking: "Internal linking",
  missing_measurement: "Thiếu đo lường",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** Null metrics stay unavailable — never coerce to 0. */
function formatMetric(
  value: number | null,
  sourceStatus: PerformanceSourceStatus | undefined,
  opts?: { percent?: boolean; decimals?: number },
): string {
  if (value == null) {
    return sourceStatus === "NOT_CONNECTED" ? "Chưa kết nối" : "—";
  }
  if (opts?.percent) {
    return `${(value * 100).toFixed(opts.decimals ?? 1)}%`;
  }
  if (opts?.decimals != null) {
    return value.toLocaleString("vi-VN", {
      minimumFractionDigits: opts.decimals,
      maximumFractionDigits: opts.decimals,
    });
  }
  return value.toLocaleString("vi-VN");
}

function refreshTone(
  status: ContentRefreshStatus,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "HEALTHY" || status === "NEW") return "success";
  if (status === "WATCH") return "info";
  if (status === "UPDATE_RECOMMENDED") return "warning";
  if (status === "URGENT") return "danger";
  return "neutral";
}

function sourceLabel(
  sources: PerformanceWorkspaceSummary["sources"] | undefined,
  id: PerformanceWorkspaceSummary["sources"][number]["id"],
): string {
  return sources?.find((s) => s.id === id)?.label ?? "—";
}

type ArticlesPayload = { articles: ContentPerformanceSummary[]; total: number };

export default function ContentPerformanceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = searchParams.get("range") ?? "28";
  const compareOn = searchParams.get("compare") !== "0";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const strategyId = searchParams.get("strategyId") ?? "";
  const clusterId = searchParams.get("clusterId") ?? "";
  const refreshStatus = searchParams.get("refreshStatus") ?? "";

  const periodQuery = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("range", range);
    qs.set("compare", compareOn ? "1" : "0");
    if (range === "custom") {
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
    }
    return qs;
  }, [range, compareOn, from, to]);

  const articlesQuery = useMemo(() => {
    const qs = new URLSearchParams(periodQuery.toString());
    qs.set("take", "50");
    if (strategyId) qs.set("strategyId", strategyId);
    if (clusterId) qs.set("clusterId", clusterId);
    if (refreshStatus) qs.set("refreshStatus", refreshStatus);
    return qs;
  }, [periodQuery, strategyId, clusterId, refreshStatus]);

  const [summary, setSummary] = useState<SectionLoadState<PerformanceWorkspaceSummary>>({
    status: "loading",
  });
  const [articles, setArticles] = useState<SectionLoadState<ArticlesPayload>>({
    status: "loading",
  });
  const [opportunities, setOpportunities] = useState<
    SectionLoadState<PerformanceOpportunity[]>
  >({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      // Normalize defaults into URL for shareable period state
      if (!next.get("range")) next.set("range", "28");
      if (next.get("compare") == null) next.set("compare", "1");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(
    async (signal: AbortSignal) => {
      setSummary({ status: "loading" });
      setArticles({ status: "loading" });
      setOpportunities({ status: "loading" });

      const periodQs = periodQuery.toString();
      const articlesQs = articlesQuery.toString();

      const [summaryResult, articlesResult, opportunitiesResult] = await Promise.all([
        fetchDashboardJson(`/api/content/performance/summary?${periodQs}`, {
          signal,
          validate: (json) => {
            const body = json as { summary?: PerformanceWorkspaceSummary; message?: string };
            if (!body.summary || typeof body.summary !== "object") {
              throw new Error(body.message ?? "Thiếu dữ liệu tổng quan.");
            }
            return body.summary;
          },
        }),
        fetchDashboardJson(`/api/content/performance/articles?${articlesQs}`, {
          signal,
          validate: (json) => {
            const body = json as ArticlesPayload & { message?: string };
            if (!Array.isArray(body.articles)) {
              throw new Error(body.message ?? "Thiếu danh sách bài.");
            }
            return { articles: body.articles, total: body.total ?? body.articles.length };
          },
        }),
        fetchDashboardJson(`/api/content/performance/opportunities?${periodQs}`, {
          signal,
          validate: (json) => {
            const body = json as { opportunities?: PerformanceOpportunity[] };
            return Array.isArray(body.opportunities) ? body.opportunities : [];
          },
        }),
      ]);

      if (signal.aborted) return;

      setSummary(sectionFromFetchResult(summaryResult, () => false));
      setArticles(
        sectionFromFetchResult(articlesResult, (data) => data.articles.length === 0),
      );
      setOpportunities(
        sectionFromFetchResult(opportunitiesResult, (rows) => rows.length === 0),
      );
    },
    [periodQuery, articlesQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadToken]);

  const summaryData = summary.status === "ready" ? summary.data : null;
  const articleRows =
    articles.status === "ready"
      ? articles.data.articles
      : articles.status === "empty"
        ? []
        : null;
  const opportunityRows =
    opportunities.status === "ready"
      ? opportunities.data
      : opportunities.status === "empty"
        ? []
        : null;

  const filterOptions = useMemo(() => {
    const rows = articleRows ?? [];
    const strategies = new Map<string, string>();
    const clusters = new Map<string, string>();
    for (const row of rows) {
      if (row.strategyId) strategies.set(row.strategyId, row.strategyName ?? row.strategyId);
      if (row.clusterId) clusters.set(row.clusterId, row.clusterName ?? row.clusterId);
    }
    return {
      strategies: [...strategies.entries()].map(([id, name]) => ({ id, name })),
      clusters: [...clusters.entries()].map(([id, name]) => ({ id, name })),
    };
  }, [articleRows]);

  const gscDisconnected =
    summaryData?.sources.some(
      (s) => s.id === "search_console" && s.status === "NOT_CONNECTED",
    ) ?? false;

  const searchStatus = summaryData?.sources.find((s) => s.id === "search_console")?.status;
  const analyticsStatus = summaryData?.sources.find((s) => s.id === "analytics")?.status;
  const crmStatus = summaryData?.sources.find((s) => s.id === "crm_attribution")?.status;

  const metricCards = summaryData
    ? [
        {
          label: "Bài đã xuất bản",
          value: summaryData.publishedArticles.toLocaleString("vi-VN"),
          source: sourceLabel(summaryData.sources, "internal_events"),
        },
        {
          label: "Search clicks",
          value: formatMetric(summaryData.searchClicks, searchStatus),
          source: sourceLabel(summaryData.sources, "search_console"),
        },
        {
          label: "Impressions",
          value: formatMetric(summaryData.searchImpressions, searchStatus),
          source: sourceLabel(summaryData.sources, "search_console"),
        },
        {
          label: "CTR",
          value: formatMetric(summaryData.organicCtr, searchStatus, { percent: true }),
          source: sourceLabel(summaryData.sources, "search_console"),
        },
        {
          label: "Position",
          value: formatMetric(summaryData.averagePosition, searchStatus, { decimals: 1 }),
          source: sourceLabel(summaryData.sources, "search_console"),
        },
        {
          label: "Page views",
          value: formatMetric(summaryData.pageViews, analyticsStatus),
          source: sourceLabel(summaryData.sources, "analytics"),
        },
        {
          label: "CTA clicks",
          value: formatMetric(summaryData.ctaClicks, analyticsStatus),
          source: sourceLabel(summaryData.sources, "analytics"),
        },
        {
          label: "Qualified leads",
          value: formatMetric(summaryData.qualifiedLeads, crmStatus),
          source: sourceLabel(summaryData.sources, "crm_attribution"),
        },
        {
          label: "Bài cần cập nhật",
          value: summaryData.articlesNeedingUpdate.toLocaleString("vi-VN"),
          source: sourceLabel(summaryData.sources, "internal_events"),
        },
      ]
    : [];

  const opportunitiesByKind = useMemo(() => {
    if (!opportunityRows) return [];
    const groups = new Map<PerformanceOpportunityKind, PerformanceOpportunity[]>();
    for (const row of opportunityRows) {
      const list = groups.get(row.kind) ?? [];
      list.push(row);
      groups.set(row.kind, list);
    }
    return [...groups.entries()].map(([kind, items]) => ({ kind, items }));
  }, [opportunityRows]);

  return (
    <>
      <AdminPageTitle title="Hiệu quả nội dung" />
      <div className="admin-panel">
        <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Theo dõi hiệu quả bài đã xuất bản và xác định nội dung cần tối ưu tiếp theo.
            </p>
            {summaryData ? (
              <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
                Kỳ: {summaryData.period.label}
                {summaryData.comparisonPeriod
                  ? ` · So sánh: ${summaryData.comparisonPeriod.label}`
                  : ""}
              </p>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/admin/content/performance/settings"
              className="admin-btn admin-btn--secondary"
            >
              Cài đặt nguồn
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

        <section className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="admin-field" style={{ margin: 0 }}>
              <span className="admin-field-label">Kỳ thời gian</span>
              <select
                className="admin-input"
                value={range}
                onChange={(e) => setParams({ range: e.target.value })}
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {range === "custom" ? (
              <>
                <label className="admin-field" style={{ margin: 0 }}>
                  <span className="admin-field-label">Từ</span>
                  <input
                    type="date"
                    className="admin-input"
                    value={from.slice(0, 10)}
                    onChange={(e) => setParams({ from: e.target.value || null })}
                  />
                </label>
                <label className="admin-field" style={{ margin: 0 }}>
                  <span className="admin-field-label">Đến</span>
                  <input
                    type="date"
                    className="admin-input"
                    value={to.slice(0, 10)}
                    onChange={(e) => setParams({ to: e.target.value || null })}
                  />
                </label>
              </>
            ) : null}
            <label
              className="admin-field"
              style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={compareOn}
                onChange={(e) => setParams({ compare: e.target.checked ? "1" : "0" })}
              />
              <span className="admin-field-label" style={{ margin: 0 }}>
                So sánh kỳ trước
              </span>
            </label>
          </div>
        </section>

        {gscDisconnected ? (
          <p className="admin-message admin-message--warning" role="status" style={{ marginBottom: 16 }}>
            Google Search Console chưa kết nối — số liệu search sẽ hiển thị &quot;Chưa kết nối&quot;,
            không dùng số 0 giả.{" "}
            <Link href="/admin/content/performance/settings">Mở cài đặt nguồn</Link>
          </p>
        ) : null}

        <section style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
            Tổng quan
          </h2>
          {summary.status === "loading" ? (
            <TableLoading title="Đang tải tổng quan…" description="Đang tổng hợp hiệu quả." tone="admin" />
          ) : summary.status === "error" ? (
            <EmptyState
              tone="error"
              title="Không tải được tổng quan"
              description={summary.message}
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
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {metricCards.map((card) => (
                <article key={card.label} className="admin-sidebar-card" style={{ margin: 0 }}>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    {card.label}
                  </p>
                  <strong style={{ fontSize: 22, display: "block", marginTop: 4 }}>{card.value}</strong>
                  <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
                    {card.source}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <div className="admin-section-header" style={{ marginBottom: 12 }}>
            <h2 className="admin-subtitle" style={{ margin: 0 }}>
              Bài đã xuất bản
            </h2>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <label className="admin-field" style={{ margin: 0 }}>
              <span className="admin-field-label">Chiến lược</span>
              <select
                className="admin-input"
                value={strategyId}
                onChange={(e) => setParams({ strategyId: e.target.value || null })}
              >
                <option value="">Tất cả</option>
                {filterOptions.strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field" style={{ margin: 0 }}>
              <span className="admin-field-label">Cụm chủ đề</span>
              <select
                className="admin-input"
                value={clusterId}
                onChange={(e) => setParams({ clusterId: e.target.value || null })}
              >
                <option value="">Tất cả</option>
                {filterOptions.clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field" style={{ margin: 0 }}>
              <span className="admin-field-label">Trạng thái cập nhật</span>
              <select
                className="admin-input"
                value={refreshStatus}
                onChange={(e) => setParams({ refreshStatus: e.target.value || null })}
              >
                <option value="">Tất cả</option>
                {(Object.keys(REFRESH_STATUS_LABELS) as ContentRefreshStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {REFRESH_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {articles.status === "loading" ? (
            <TableLoading title="Đang tải danh sách bài…" description="Đang tải hiệu quả từng bài." tone="admin" />
          ) : articles.status === "error" ? (
            <EmptyState
              tone="error"
              title="Không tải được danh sách bài"
              description={articles.message}
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
          ) : !articleRows || articleRows.length === 0 ? (
            <EmptyState
              title="Chưa có bài đã xuất bản"
              description="Khi có bài PUBLISHED, bảng hiệu quả sẽ xuất hiện tại đây."
              action={
                <Link href="/admin/content/publishing" className="admin-btn admin-btn--primary">
                  Mở workspace xuất bản
                </Link>
              }
            />
          ) : (
            <>
              <div className="admin-table-wrap admin-table-wrap--crm" style={{ marginBottom: 12 }}>
                <table className="admin-table admin-table--crm admin-table--compact">
                  <thead>
                    <tr>
                      <th>Tiêu đề</th>
                      <th>Cụm</th>
                      <th>Xuất bản</th>
                      <th>Clicks</th>
                      <th>Impr.</th>
                      <th>CTR</th>
                      <th>Pos.</th>
                      <th>Views</th>
                      <th>Leads</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {articleRows.map((row) => (
                      <tr key={row.contentId}>
                        <td>
                          <strong>{row.title}</strong>
                        </td>
                        <td>{row.clusterName ?? "—"}</td>
                        <td>{formatDate(row.publishedAt)}</td>
                        <td>{formatMetric(row.search.clicks, row.search.sourceStatus)}</td>
                        <td>{formatMetric(row.search.impressions, row.search.sourceStatus)}</td>
                        <td>
                          {formatMetric(row.search.ctr, row.search.sourceStatus, { percent: true })}
                        </td>
                        <td>
                          {formatMetric(row.search.averagePosition, row.search.sourceStatus, {
                            decimals: 1,
                          })}
                        </td>
                        <td>
                          {formatMetric(row.engagement.pageViews, row.engagement.sourceStatus)}
                        </td>
                        <td>
                          {formatMetric(
                            row.conversion.attributedLeads,
                            row.conversion.sourceStatus,
                          )}
                        </td>
                        <td>
                          <StatusBadge tone={refreshTone(row.editorial.refreshStatus)}>
                            {REFRESH_STATUS_LABELS[row.editorial.refreshStatus]}
                          </StatusBadge>
                        </td>
                        <td>
                          <Link
                            href={`/admin/content/performance/${row.contentId}?${periodQuery.toString()}`}
                            className="admin-btn admin-btn--primary admin-btn--small"
                          >
                            Xem hiệu quả
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                }}
                className="admin-performance-article-cards"
              >
                {articleRows.map((row) => (
                  <article key={`card-${row.contentId}`} className="admin-sidebar-card" style={{ margin: 0 }}>
                    <strong>{row.title}</strong>
                    <p className="admin-field-hint" style={{ margin: "4px 0" }}>
                      {row.clusterName ?? "Không cụm"} · {formatDate(row.publishedAt)}
                    </p>
                    <p className="admin-field-hint" style={{ margin: "0 0 8px" }}>
                      Clicks {formatMetric(row.search.clicks, row.search.sourceStatus)} · Leads{" "}
                      {formatMetric(row.conversion.attributedLeads, row.conversion.sourceStatus)}
                    </p>
                    <StatusBadge tone={refreshTone(row.editorial.refreshStatus)}>
                      {REFRESH_STATUS_LABELS[row.editorial.refreshStatus]}
                    </StatusBadge>
                    <div style={{ marginTop: 10 }}>
                      <Link
                        href={`/admin/content/performance/${row.contentId}?${periodQuery.toString()}`}
                        className="admin-btn admin-btn--primary admin-btn--small"
                      >
                        Xem hiệu quả
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="admin-sidebar-card" style={{ margin: 0 }}>
          <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
            Cơ hội tối ưu
          </h2>
          {opportunities.status === "loading" ? (
            <TableLoading title="Đang tải cơ hội…" description="Đang nhóm khuyến nghị." tone="admin" />
          ) : opportunities.status === "error" ? (
            <EmptyState
              tone="error"
              title="Không tải được cơ hội tối ưu"
              description={opportunities.message}
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
          ) : !opportunityRows || opportunityRows.length === 0 ? (
            <EmptyState
              title="Chưa có cơ hội tối ưu"
              description="Khi có tín hiệu biên tập hoặc đo lường đủ, các nhóm cơ hội sẽ xuất hiện tại đây."
            />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {opportunitiesByKind.map(({ kind, items }) => (
                <div key={kind}>
                  <h3 className="admin-sidebar-title" style={{ marginBottom: 8 }}>
                    {OPPORTUNITY_KIND_VI[kind] ?? OPPORTUNITY_KIND_LABELS[kind]}
                    <span className="admin-field-hint" style={{ marginLeft: 8 }}>
                      ({items.length})
                    </span>
                  </h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    {items.map((item) => (
                      <article
                        key={item.id}
                        style={{
                          border: "1px solid var(--admin-border, #e5e7eb)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong>{item.title}</strong>
                          <StatusBadge tone={refreshTone(item.refreshStatus)}>
                            {REFRESH_STATUS_LABELS[item.refreshStatus]}
                          </StatusBadge>
                        </div>
                        <p className="admin-field-hint" style={{ margin: 0 }}>
                          {item.reason}
                        </p>
                        {item.evidence.length > 0 ? (
                          <ul className="admin-field-hint" style={{ margin: 0, paddingLeft: 18 }}>
                            {item.evidence.map((ev) => (
                              <li key={ev}>{ev}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div>
                          <Link
                            href={item.nextActionHref}
                            className="admin-btn admin-btn--secondary admin-btn--small"
                          >
                            {item.nextActionLabel}
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
