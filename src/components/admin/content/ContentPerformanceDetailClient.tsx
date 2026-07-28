"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  fetchDashboardJson,
  sectionFromFetchResult,
  type SectionLoadState,
} from "@/features/content/editorial/dashboard-fetch";
import { topicWorkspaceHref } from "@/features/content/editorial/editorial-ux";
import type {
  ContentPerformanceSummary,
  ContentRefreshStatus,
  PerformanceSourceStatus,
} from "@/features/content/performance/content-performance.types";
import { REFRESH_STATUS_LABELS } from "@/features/content/performance/content-performance.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function formatMetric(
  value: number | null,
  sourceStatus: PerformanceSourceStatus,
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

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span className="admin-field-hint">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ContentPerformanceDetailClient({ blogId }: { blogId: string }) {
  const searchParams = useSearchParams();
  const periodQs = useMemo(() => {
    const qs = new URLSearchParams();
    const range = searchParams.get("range") ?? "28";
    const compare = searchParams.get("compare") !== "0" ? "1" : "0";
    qs.set("range", range);
    qs.set("compare", compare);
    if (range === "custom") {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
    }
    return qs.toString();
  }, [searchParams]);

  const [state, setState] = useState<SectionLoadState<ContentPerformanceSummary>>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setState({ status: "loading" });
      const result = await fetchDashboardJson(
        `/api/content/performance/articles/${encodeURIComponent(blogId)}?${periodQs}`,
        {
          signal,
          validate: (json) => {
            const body = json as { article?: ContentPerformanceSummary; message?: string };
            if (!body.article) {
              throw new Error(body.message ?? "Không tìm thấy bài đã xuất bản.");
            }
            return body.article;
          },
        },
      );
      if (signal.aborted) return;
      setState(sectionFromFetchResult(result, () => false));
    },
    [blogId, periodQs],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadToken]);

  const article = state.status === "ready" ? state.data : null;
  const searchDisconnected = article?.search.sourceStatus === "NOT_CONNECTED";
  const hasSearchData =
    article != null &&
    (article.search.clicks != null ||
      article.search.impressions != null ||
      article.search.ctr != null ||
      article.search.averagePosition != null);

  const backHref = `/admin/content/performance?${periodQs}`;

  return (
    <>
      <AdminPageTitle title={article?.title ?? "Chi tiết hiệu quả"} />
      <div className="admin-panel">
        <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Hiệu quả bài đã xuất bản — chỉ hiển thị số liệu khi nguồn đo lường có dữ liệu thật.
            </p>
            {article ? (
              <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
                {article.clusterName ?? "Không cụm"}
                {article.strategyName ? ` · ${article.strategyName}` : ""} · Xuất bản{" "}
                {formatDate(article.publishedAt)}
              </p>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={backHref} className="admin-btn admin-btn--secondary">
              Quay lại danh sách
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
            title="Đang tải hiệu quả bài…"
            description="Đang lấy search, engagement và conversion."
            tone="admin"
          />
        ) : null}

        {state.status === "error" ? (
          <EmptyState
            tone="error"
            title="Không tải được chi tiết hiệu quả"
            description={state.message}
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => setReloadToken((n) => n + 1)}
                >
                  Thử lại
                </button>
                <Link href={backHref} className="admin-btn admin-btn--secondary">
                  Quay lại
                </Link>
              </div>
            }
          />
        ) : null}

        {article ? (
          <div style={{ display: "grid", gap: 16 }}>
            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
                Tóm tắt
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                <article>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Clicks
                  </p>
                  <strong style={{ fontSize: 20 }}>
                    {formatMetric(article.search.clicks, article.search.sourceStatus)}
                  </strong>
                </article>
                <article>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Impressions
                  </p>
                  <strong style={{ fontSize: 20 }}>
                    {formatMetric(article.search.impressions, article.search.sourceStatus)}
                  </strong>
                </article>
                <article>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    CTR
                  </p>
                  <strong style={{ fontSize: 20 }}>
                    {formatMetric(article.search.ctr, article.search.sourceStatus, {
                      percent: true,
                    })}
                  </strong>
                </article>
                <article>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Position
                  </p>
                  <strong style={{ fontSize: 20 }}>
                    {formatMetric(article.search.averagePosition, article.search.sourceStatus, {
                      decimals: 1,
                    })}
                  </strong>
                </article>
                <article>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Page views
                  </p>
                  <strong style={{ fontSize: 20 }}>
                    {formatMetric(article.engagement.pageViews, article.engagement.sourceStatus)}
                  </strong>
                </article>
                <article>
                  <p className="admin-field-hint" style={{ margin: 0 }}>
                    Leads gắn
                  </p>
                  <strong style={{ fontSize: 20 }}>
                    {formatMetric(
                      article.conversion.attributedLeads,
                      article.conversion.sourceStatus,
                    )}
                  </strong>
                </article>
              </div>
            </section>

            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
                Search
              </h2>
              {searchDisconnected || !hasSearchData ? (
                <EmptyState
                  title="Chưa kết nối Google Search Console"
                  description="Không hiển thị biểu đồ hoặc số 0 giả khi chưa có dữ liệu search thật."
                  action={
                    <Link
                      href="/admin/content/performance/settings"
                      className="admin-btn admin-btn--primary"
                    >
                      Mở cài đặt nguồn
                    </Link>
                  }
                />
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <MetricRow
                    label="Impressions"
                    value={formatMetric(article.search.impressions, article.search.sourceStatus)}
                  />
                  <MetricRow
                    label="Clicks"
                    value={formatMetric(article.search.clicks, article.search.sourceStatus)}
                  />
                  <MetricRow
                    label="CTR"
                    value={formatMetric(article.search.ctr, article.search.sourceStatus, {
                      percent: true,
                    })}
                  />
                  <MetricRow
                    label="Average position"
                    value={formatMetric(
                      article.search.averagePosition,
                      article.search.sourceStatus,
                      { decimals: 1 },
                    )}
                  />
                </div>
              )}
            </section>

            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
                Engagement
              </h2>
              {article.engagement.sourceStatus === "NOT_CONNECTED" ||
              (article.engagement.pageViews == null &&
                article.engagement.users == null &&
                article.engagement.engagedSessions == null) ? (
                <EmptyState
                  title="Chưa có dữ liệu engagement"
                  description="Page views và phiên tương tác chỉ hiện khi Analytics/API đã nối và trả số liệu."
                  compact
                />
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <MetricRow
                    label="Page views"
                    value={formatMetric(
                      article.engagement.pageViews,
                      article.engagement.sourceStatus,
                    )}
                  />
                  <MetricRow
                    label="Users"
                    value={formatMetric(article.engagement.users, article.engagement.sourceStatus)}
                  />
                  <MetricRow
                    label="Engaged sessions"
                    value={formatMetric(
                      article.engagement.engagedSessions,
                      article.engagement.sourceStatus,
                    )}
                  />
                  <MetricRow
                    label="Avg engagement (giây)"
                    value={formatMetric(
                      article.engagement.averageEngagementSeconds,
                      article.engagement.sourceStatus,
                      { decimals: 1 },
                    )}
                  />
                </div>
              )}
            </section>

            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
                Conversion
              </h2>
              <div style={{ display: "grid", gap: 8 }}>
                <MetricRow
                  label="CTA clicks"
                  value={formatMetric(article.conversion.ctaClicks, article.conversion.sourceStatus)}
                />
                <MetricRow
                  label="Yêu cầu báo giá"
                  value={formatMetric(
                    article.conversion.quoteRequests,
                    article.conversion.sourceStatus,
                  )}
                />
                <MetricRow
                  label="Dealer leads"
                  value={formatMetric(
                    article.conversion.dealerLeads,
                    article.conversion.sourceStatus,
                  )}
                />
                <MetricRow
                  label="Leads gắn (attributed)"
                  value={formatMetric(
                    article.conversion.attributedLeads,
                    article.conversion.sourceStatus,
                  )}
                />
                <MetricRow
                  label="Conversion rate"
                  value={formatMetric(
                    article.conversion.conversionRate,
                    article.conversion.sourceStatus,
                    { percent: true },
                  )}
                />
              </div>
              {article.conversion.attributedLeads != null &&
              article.conversion.attributedLeads > 0 ? (
                <p className="admin-field-hint" style={{ margin: "12px 0 0" }}>
                  Có {article.conversion.attributedLeads.toLocaleString("vi-VN")} lead gắn landing
                  URL khớp /blog/{article.slug}.
                </p>
              ) : null}
            </section>

            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
                Độ tươi & biên tập
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <StatusBadge tone={refreshTone(article.editorial.refreshStatus)}>
                  {REFRESH_STATUS_LABELS[article.editorial.refreshStatus]}
                </StatusBadge>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <MetricRow
                  label="Ngày từ khi XB"
                  value={
                    article.editorial.daysSincePublish == null
                      ? "—"
                      : `${article.editorial.daysSincePublish}`
                  }
                />
                <MetricRow
                  label="Ngày từ khi cập nhật"
                  value={`${article.editorial.daysSinceUpdate}`}
                />
                <MetricRow
                  label="Số từ"
                  value={
                    article.editorial.wordCount == null
                      ? "—"
                      : article.editorial.wordCount.toLocaleString("vi-VN")
                  }
                />
                <MetricRow
                  label="Internal links"
                  value={
                    article.editorial.internalLinkCount == null
                      ? "—"
                      : `${article.editorial.internalLinkCount}`
                  }
                />
                <MetricRow
                  label="Hình ảnh"
                  value={
                    article.editorial.imageCount == null
                      ? "—"
                      : `${article.editorial.imageCount}`
                  }
                />
                <MetricRow
                  label="Có CTA"
                  value={
                    article.editorial.hasCta == null
                      ? "—"
                      : article.editorial.hasCta
                        ? "Có"
                        : "Chưa"
                  }
                />
              </div>
              {article.editorial.refreshReasons.length > 0 ? (
                <ul className="admin-field-hint" style={{ margin: "12px 0 0", paddingLeft: 18 }}>
                  {article.editorial.refreshReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <p className="admin-field-hint" style={{ margin: "12px 0 0" }}>
                  Không có lý do cập nhật đặc biệt trong kỳ quan sát hiện tại.
                </p>
              )}
            </section>

            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h2 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
                Khuyến nghị
              </h2>
              <p style={{ margin: "0 0 8px" }}>
                {REFRESH_STATUS_LABELS[article.editorial.refreshStatus]}
                {article.editorial.refreshReasons[0]
                  ? ` — ${article.editorial.refreshReasons[0]}`
                  : "."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {article.topicId ? (
                  <Link
                    href={topicWorkspaceHref(article.topicId)}
                    className="admin-btn admin-btn--primary"
                  >
                    Mở Topic Workspace
                  </Link>
                ) : null}
                <Link
                  href={`/admin/blog/${article.contentId}`}
                  className="admin-btn admin-btn--secondary"
                >
                  Mở Blog editor
                </Link>
                <Link href={backHref} className="admin-btn admin-btn--secondary">
                  Quay lại
                </Link>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
