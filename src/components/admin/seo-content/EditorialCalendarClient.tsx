"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { EmptyState } from "@/components/admin/AdminUi";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  AGENDA_GROUP_LABELS,
  buildMonthGrid,
  buildWeekDays,
  CALENDAR_PIPELINE_COLUMNS,
  campaignProgress,
  computeWeekCapacity,
  deadlineToneColors,
  filterCalendarTopics,
  getDeadlineTone,
  groupTopicsByAgenda,
  groupTopicsByPipeline,
  toCalendarCardModel,
  type CalendarViewMode,
  type EditorialCalendarCampaign,
  type EditorialCalendarTopic,
} from "@/features/content/editorial/editorial-calendar";
import {
  CONTENT_STATUS_COLORS,
  topicStatusTone,
} from "@/features/content/editorial/editorial-ux";
import {
  SEO_TOPIC_PRIORITY_LABELS,
  SEO_TOPIC_STATUS_LABELS,
} from "@/features/content/seo/seo-labels";
import type { SeoTopicPriority, SeoTopicStatus } from "@prisma/client";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function TopicCard({ topic }: { topic: EditorialCalendarTopic }) {
  const card = toCalendarCardModel(topic);
  const statusTone = CONTENT_STATUS_COLORS[topicStatusTone(topic.status)];
  const deadlineTone = deadlineToneColors(card.deadlineTone);
  return (
    <article
      className="admin-sidebar-card"
      style={{
        margin: 0,
        display: "grid",
        gap: 8,
        borderColor: deadlineTone.border,
        background: card.deadlineTone === "late" ? deadlineTone.bg : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>{topic.title}</strong>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            background: statusTone.bg,
            color: statusTone.fg,
            border: `1px solid ${statusTone.border}`,
            height: "fit-content",
            whiteSpace: "nowrap",
          }}
        >
          {SEO_TOPIC_STATUS_LABELS[topic.status]}
        </span>
      </div>
      <p className="admin-field-hint" style={{ margin: 0 }}>
        {topic.primaryKeyword}
      </p>
      <div style={{ height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ width: `${card.progress}%`, height: "100%", background: "#2563eb" }} />
      </div>
      <p className="admin-field-hint" style={{ margin: 0 }}>
        {card.progress}% · {CALENDAR_PIPELINE_COLUMNS.find((c) => c.key === card.stage)?.label}
        {card.readingMinutes ? ` · ~${card.readingMinutes} phút đọc` : ""}
      </p>
      <p className="admin-field-hint" style={{ margin: 0 }}>
        Owner: {topic.assignedTo ?? "—"} · Ưu tiên {SEO_TOPIC_PRIORITY_LABELS[topic.priority]}
      </p>
      <p className="admin-field-hint" style={{ margin: 0, color: deadlineTone.fg }}>
        Publish target: {formatDate(topic.dueDate)}
      </p>
      <div>
        <Link href={card.workspaceHref} className="admin-btn admin-btn--primary admin-btn--small">
          Open Workspace
        </Link>
      </div>
    </article>
  );
}

export default function EditorialCalendarClient() {
  const toast = useAdminToast();
  const [topics, setTopics] = useState<EditorialCalendarTopic[]>([]);
  const [campaigns, setCampaigns] = useState<EditorialCalendarCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CalendarViewMode>("pipeline");
  const [anchorMonth, setAnchorMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filters, setFilters] = useState({
    strategyId: "",
    clusterId: "",
    owner: "",
    status: "",
    priority: "",
    month: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/seo/calendar", { cache: "no-store" });
      const json = (await res.json()) as {
        plan?: { topics: EditorialCalendarTopic[]; campaigns: EditorialCalendarCampaign[] };
        message?: string;
      };
      if (!res.ok || !json.plan) throw new Error(json.message ?? "Không thể tải lịch biên tập");
      setTopics(json.plan.topics);
      setCampaigns(json.plan.campaigns);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải lịch biên tập";
      setError(message);
      toast.error(message);
      setTopics([]);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Apply URL filters once after load (planning deep-links from Strategy / Dashboard)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const strategyId = params.get("strategyId") ?? "";
    const viewParam = params.get("view");
    if (strategyId) setFilters((f) => ({ ...f, strategyId }));
    if (viewParam === "month" || viewParam === "week" || viewParam === "agenda" || viewParam === "pipeline") {
      setView(viewParam);
    }
  }, []);

  const filtered = useMemo(() => filterCalendarTopics(topics, {
    strategyId: filters.strategyId || undefined,
    clusterId: filters.clusterId || undefined,
    owner: filters.owner || undefined,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    month: filters.month || undefined,
  }), [topics, filters]);

  const pipeline = useMemo(() => groupTopicsByPipeline(filtered), [filtered]);
  const agenda = useMemo(() => groupTopicsByAgenda(filtered), [filtered]);
  const capacity = useMemo(() => computeWeekCapacity(filtered), [filtered]);
  const monthCells = useMemo(
    () => buildMonthGrid(anchorMonth.getFullYear(), anchorMonth.getMonth(), filtered),
    [anchorMonth, filtered],
  );
  const weekCells = useMemo(() => buildWeekDays(anchorMonth, filtered), [anchorMonth, filtered]);

  const strategyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of topics) map.set(t.strategyId, t.strategyName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [topics]);

  const clusterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of topics) {
      if (filters.strategyId && t.strategyId !== filters.strategyId) continue;
      map.set(t.clusterId, t.clusterName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [topics, filters.strategyId]);

  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of topics) if (t.assignedTo) set.add(t.assignedTo);
    return [...set].sort();
  }, [topics]);

  const activeCampaigns = campaigns.filter((c) => c.topicCount > 0).slice(0, 6);

  return (
    <>
      <AdminPageTitle title="Lịch biên tập" />
      <div className="admin-panel">
        <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
          <p className="admin-field-hint" style={{ margin: 0 }}>
            Lập kế hoạch xuất bản theo tuần / tháng / quý — không thay đổi quy trình.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["pipeline", "month", "week", "agenda"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={
                  view === mode ? "admin-btn admin-btn--primary" : "admin-btn admin-btn--secondary"
                }
                onClick={() => setView(mode)}
              >
                {mode === "pipeline"
                  ? "Pipeline"
                  : mode === "month"
                    ? "Month"
                    : mode === "week"
                      ? "Week"
                      : "Agenda"}
              </button>
            ))}
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
              Tải lại
            </button>
          </div>
        </div>

        {/* Campaign timeline */}
        <section className="admin-section-card" style={{ marginBottom: 16 }}>
          <h2 className="admin-subtitle" style={{ marginTop: 0 }}>
            Current Campaigns
          </h2>
          {activeCampaigns.length === 0 ? (
            <p className="admin-field-hint">Chưa có chiến dịch / chiến lược đang theo dõi.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {activeCampaigns.map((campaign) => {
                const pct = campaignProgress(campaign);
                return (
                  <Link
                    key={campaign.id}
                    href={`/admin/content/seo-strategies/${campaign.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{campaign.name}</strong>
                        <span className="admin-field-hint">
                          {pct}% · {campaign.publishedCount} / {campaign.topicCount} published
                        </span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#047857" }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <select
            className="admin-input"
            value={filters.strategyId}
            onChange={(e) => setFilters((f) => ({ ...f, strategyId: e.target.value, clusterId: "" }))}
          >
            <option value="">Campaign</option>
            {strategyOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filters.clusterId}
            onChange={(e) => setFilters((f) => ({ ...f, clusterId: e.target.value }))}
          >
            <option value="">Cluster</option>
            {clusterOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filters.owner}
            onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))}
          >
            <option value="">Owner</option>
            {ownerOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Status</option>
            {(Object.keys(SEO_TOPIC_STATUS_LABELS) as SeoTopicStatus[]).map((s) => (
              <option key={s} value={s}>
                {SEO_TOPIC_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="">Priority</option>
            {(Object.keys(SEO_TOPIC_PRIORITY_LABELS) as SeoTopicPriority[]).map((p) => (
              <option key={p} value={p}>
                {SEO_TOPIC_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <input
            type="month"
            className="admin-input"
            value={filters.month}
            onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
            aria-label="Month filter"
          />
        </div>

        {loading ? (
          <TableLoading title="Đang tải lịch biên tập…" description="Đang tổng hợp chủ đề và chiến dịch." tone="admin" />
        ) : error ? (
          <EmptyState
            tone="error"
            title="Không tải được lịch biên tập"
            description={error}
            action={
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void load()}>
                Thử lại
              </button>
            }
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 220px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div>
              {view === "pipeline" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  {CALENDAR_PIPELINE_COLUMNS.map((col) => (
                    <section key={col.key} className="admin-sidebar-card" style={{ margin: 0, minHeight: 200 }}>
                      <h3 className="admin-sidebar-title" style={{ marginBottom: 10 }}>
                        {col.label}{" "}
                        <span className="admin-field-hint">({pipeline[col.key].length})</span>
                      </h3>
                      <div style={{ display: "grid", gap: 10 }}>
                        {pipeline[col.key].length === 0 ? (
                          <p className="admin-field-hint">Trống</p>
                        ) : (
                          pipeline[col.key].slice(0, 12).map((topic) => (
                            <TopicCard key={topic.id} topic={topic} />
                          ))
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}

              {view === "month" ? (
                <section className="admin-section-card">
                  <div className="admin-section-header">
                    <h2 className="admin-subtitle" style={{ margin: 0 }}>
                      {anchorMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                    </h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() =>
                          setAnchorMonth(new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - 1, 1))
                        }
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() =>
                          setAnchorMonth(new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 1))
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 6,
                    }}
                  >
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                      <div key={d} className="admin-field-hint" style={{ textAlign: "center" }}>
                        {d}
                      </div>
                    ))}
                    {monthCells.map((cell) => (
                      <div
                        key={cell.date.toISOString()}
                        style={{
                          minHeight: 88,
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: 6,
                          opacity: cell.inMonth ? 1 : 0.45,
                          background: "#fff",
                        }}
                      >
                        <div className="admin-field-hint" style={{ marginBottom: 4 }}>
                          {cell.date.getDate()}
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          {cell.topics.slice(0, 3).map((topic) => {
                            const tone = deadlineToneColors(getDeadlineTone(topic.dueDate, topic.status));
                            return (
                              <Link
                                key={topic.id}
                                href={`/admin/content/topics/${topic.id}`}
                                style={{
                                  display: "block",
                                  fontSize: 11,
                                  padding: "2px 4px",
                                  borderRadius: 4,
                                  background: tone.bg,
                                  color: tone.fg,
                                  textDecoration: "none",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={topic.title}
                              >
                                {topic.title}
                              </Link>
                            );
                          })}
                          {cell.topics.length > 3 ? (
                            <span className="admin-field-hint">+{cell.topics.length - 3}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {view === "week" ? (
                <section className="admin-section-card">
                  <div className="admin-section-header">
                    <h2 className="admin-subtitle" style={{ margin: 0 }}>
                      Week view
                    </h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() => setAnchorMonth(new Date(anchorMonth.getTime() - 7 * 86400000))}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() => setAnchorMonth(new Date(anchorMonth.getTime() + 7 * 86400000))}
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {weekCells.map((cell) => (
                      <div key={cell.date.toISOString()} className="admin-sidebar-card" style={{ margin: 0 }}>
                        <h3 className="admin-sidebar-title">
                          {cell.date.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short" })}
                        </h3>
                        <div style={{ display: "grid", gap: 8 }}>
                          {cell.topics.length === 0 ? (
                            <p className="admin-field-hint">Trống</p>
                          ) : (
                            cell.topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {view === "agenda" ? (
                <div style={{ display: "grid", gap: 16 }}>
                  {(Object.keys(AGENDA_GROUP_LABELS) as Array<keyof typeof AGENDA_GROUP_LABELS>).map((key) => {
                    const rows = agenda[key];
                    if (rows.length === 0) return null;
                    return (
                      <section key={key} className="admin-section-card">
                        <h2 className="admin-subtitle" style={{ marginTop: 0 }}>
                          {AGENDA_GROUP_LABELS[key]}
                        </h2>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {rows.map((topic) => (
                            <TopicCard key={topic.id} topic={topic} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Capacity sidebar */}
            <aside className="admin-sidebar-card" style={{ margin: 0, position: "sticky", top: 12 }}>
              <h3 className="admin-sidebar-title">This Week</h3>
              {(
                [
                  ["Planned", capacity.planned, CONTENT_STATUS_COLORS.draft],
                  ["Published", capacity.published, CONTENT_STATUS_COLORS.published],
                  ["Overdue", capacity.overdue, CONTENT_STATUS_COLORS.needsReview],
                  ["Blocked", capacity.blocked, CONTENT_STATUS_COLORS.blocked],
                  ["Ready", capacity.ready, CONTENT_STATUS_COLORS.scheduled],
                ] as const
              ).map(([label, value, tone]) => (
                <div
                  key={label}
                  style={{
                    marginBottom: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    color: tone.fg,
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: 12 }}>{label}</div>
                </div>
              ))}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
