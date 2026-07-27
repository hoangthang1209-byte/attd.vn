"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  CONTENT_STATUS_COLORS,
  deriveWorkflowNodeStates,
  EDITORIAL_TASK_GROUP_LABELS,
  EDITORIAL_WORKFLOW_STEPS,
  getTopicNextAction,
  topicStatusTone,
  type EditorialTaskGroup,
} from "@/features/content/editorial/editorial-ux";
import {
  SEO_TOPIC_PRIORITY_LABELS,
  SEO_TOPIC_STATUS_LABELS,
} from "@/features/content/seo/seo-labels";
import type { SeoTopicPriority, SeoTopicStatus } from "@prisma/client";

type DashboardCounts = {
  activeStrategies: number;
  totalTopics: number;
  approvedTopics: number;
  briefReadyTopics: number;
  draftingTopics: number;
  reviewTopics: number;
  publishedTopics: number;
  overdueTopics: number;
  missingMediaTopics: number;
  noTargetUrlTopics: number;
};

type PriorityTopic = {
  id: string;
  title: string;
  primaryKeyword: string;
  status: SeoTopicStatus;
  priority: SeoTopicPriority;
  businessValue: number;
  dueDate: string | null;
  cluster: { name: string; strategy: { name: string } };
};

type UpcomingTopic = {
  id: string;
  title: string;
  status: SeoTopicStatus;
  dueDate: string | null;
  cluster: { name: string };
};

type ClusterCoverage = {
  id: string;
  name: string;
  strategyName: string;
  total: number;
  published: number;
  inProgress: number;
  missing: number;
  avgBusinessValue: number;
  missingMedia: number;
};

type DashboardData = {
  counts: DashboardCounts;
  priorityTopics: PriorityTopic[];
  upcomingDue: UpcomingTopic[];
  clusterCoverage: ClusterCoverage[];
};

type ReviewRow = {
  id: string;
  status: string;
  topicId: string | null;
  topicTitle: string | null;
  qaScore: number | null;
  blockingIssues: number;
  updatedAt: string;
};

type PublishingQueues = {
  ready?: Array<Record<string, unknown>>;
  scheduled?: Array<Record<string, unknown>>;
  failed?: Array<Record<string, unknown>>;
  recent?: Array<Record<string, unknown>>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span className="admin-field-hint">{label}</span>
        <strong style={{ fontSize: 12 }}>{clamped}%</strong>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: "#2563eb" }} />
      </div>
    </div>
  );
}

export default function SeoDashboardClient() {
  const toast = useAdminToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [queues, setQueues] = useState<PublishingQueues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, reviewRes, pubRes] = await Promise.all([
        fetch("/api/content/seo/dashboard"),
        fetch("/api/content/reviews"),
        fetch("/api/content/publishing"),
      ]);
      const dashJson = (await dashRes.json()) as { dashboard?: DashboardData; message?: string };
      if (!dashRes.ok || !dashJson.dashboard) {
        throw new Error(dashJson.message ?? "Không thể tải Content Dashboard");
      }
      setData(dashJson.dashboard);

      if (reviewRes.ok) {
        const reviewJson = (await reviewRes.json()) as { reviews?: ReviewRow[] };
        setReviews(reviewJson.reviews ?? []);
      } else {
        setReviews([]);
      }

      if (pubRes.ok) {
        const pubJson = (await pubRes.json()) as { queues?: PublishingQueues };
        setQueues(pubJson.queues ?? null);
      } else {
        setQueues(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải Content Dashboard";
      setError(message);
      toast.error(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const openReviews = useMemo(
    () => reviews.filter((r) => ["NOT_STARTED", "IN_REVIEW", "CHANGES_REQUESTED"].includes(r.status)),
    [reviews],
  );
  const readyToPublish = queues?.ready?.length ?? 0;
  const recentlyPublished = queues?.recent?.length ?? 0;

  const todaySummary = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Chủ đề cần Brief", value: data.counts.approvedTopics, href: "/admin/content/seo-topics?view=approved" },
      { label: "Brief chờ duyệt / viết", value: data.counts.briefReadyTopics, href: "/admin/content/seo-topics?view=brief" },
      { label: "Bản nháp đang viết", value: data.counts.draftingTopics, href: "/admin/content/seo-topics?view=drafting" },
      { label: "Chờ kiểm duyệt", value: Math.max(data.counts.reviewTopics, openReviews.length), href: "/admin/content/reviews" },
      { label: "Sẵn sàng xuất bản", value: readyToPublish, href: "/admin/content/publishing" },
      { label: "Thiếu hình ảnh", value: data.counts.missingMediaTopics, href: "/admin/content/seo-topics?view=missing-media" },
    ];
  }, [data, openReviews.length, readyToPublish]);

  const inboxGroups = useMemo(() => {
    if (!data) return [] as Array<{ group: EditorialTaskGroup; items: PriorityTopic[] }>;
    const buckets: Record<EditorialTaskGroup, PriorityTopic[]> = {
      needs_brief: [],
      needs_context: [],
      needs_writing: [],
      needs_review: [],
      ready_to_publish: [],
      recently_published: [],
    };
    for (const topic of data.priorityTopics) {
      const action = getTopicNextAction(topic.status);
      if (topic.status === "BRIEF_READY" && data.counts.missingMediaTopics > 0) {
        buckets.needs_context.push(topic);
      } else {
        buckets[action.group].push(topic);
      }
    }
    return (Object.keys(buckets) as EditorialTaskGroup[])
      .map((group) => ({ group, items: buckets[group] }))
      .filter((entry) => entry.items.length > 0);
  }, [data]);

  const workflowStates = useMemo(
    () => (data ? deriveWorkflowNodeStates(data.counts) : null),
    [data],
  );

  const health = useMemo(() => {
    if (!data) return null;
    const total = Math.max(1, data.counts.totalTopics);
    return {
      knowledge: Math.round(((total - data.counts.noTargetUrlTopics) / total) * 100),
      images: Math.round(((total - data.counts.missingMediaTopics) / total) * 100),
      seo: Math.round((data.counts.briefReadyTopics + data.counts.draftingTopics + data.counts.reviewTopics + data.counts.publishedTopics) / total * 100),
      review: Math.round(((total - data.counts.reviewTopics) / total) * 100),
      publishing: Math.round((data.counts.publishedTopics / total) * 100),
    };
  }, [data]);

  return (
    <>
      <AdminPageTitle title="Content Dashboard" />
      <div className="admin-panel">
        <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Bảng điều khiển biên tập — ưu tiên việc cần làm hôm nay, không phải số liệu kỹ thuật.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/content/seo-topics" className="admin-btn admin-btn--primary">
              Mở danh sách chủ đề
            </Link>
            <Link href="/admin/content/launch" className="admin-btn admin-btn--secondary">
              Quy trình viết bài
            </Link>
          </div>
        </div>

        {loading ? (
          <TableLoading
            title="Đang tải Content Dashboard…"
            description="Đang tổng hợp việc hôm nay từ chủ đề, kiểm duyệt và xuất bản."
            tone="admin"
          />
        ) : error || !data ? (
          <EmptyState
            tone="error"
            title="Không thể tải Content Dashboard"
            description={error ?? "Vui lòng thử lại sau."}
            action={
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
                Thử lại
              </button>
            }
          />
        ) : (
          <>
            <section className="admin-section-card" style={{ marginBottom: 16 }}>
              <div className="admin-section-header">
                <h2 className="admin-subtitle" style={{ margin: 0 }}>
                  Việc hôm nay
                </h2>
                <span className="admin-field-hint">Dữ liệu thật từ quy trình hiện tại</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {todaySummary.map((card) => (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="admin-catalog-kpi"
                    style={{
                      margin: 0,
                      textAlign: "left",
                      textDecoration: "none",
                      border: "1px solid #e5e7eb",
                      padding: "12px 14px",
                    }}
                  >
                    <strong style={{ fontSize: 22 }}>{card.value}</strong>
                    <span>{card.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {workflowStates ? (
              <section className="admin-section-card" style={{ marginBottom: 16 }}>
                <div className="admin-section-header">
                  <h2 className="admin-subtitle" style={{ margin: 0 }}>
                    Quy trình biên tập
                  </h2>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  {EDITORIAL_WORKFLOW_STEPS.map((step, index) => {
                    const state = workflowStates[step.key];
                    const tone =
                      state === "completed"
                        ? CONTENT_STATUS_COLORS.published
                        : state === "active"
                          ? CONTENT_STATUS_COLORS.draft
                          : state === "blocked"
                            ? CONTENT_STATUS_COLORS.blocked
                            : CONTENT_STATUS_COLORS.waiting;
                    return (
                      <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          title={`${step.label}: ${state}`}
                          style={{
                            minWidth: 92,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${tone.border}`,
                            background: tone.bg,
                            color: tone.fg,
                            textAlign: "center",
                            fontWeight: state === "active" ? 700 : 500,
                            fontSize: 13,
                          }}
                        >
                          {step.label}
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                            {state === "completed"
                              ? "Hoàn thành"
                              : state === "active"
                                ? "Đang làm"
                                : state === "blocked"
                                  ? "Bị chặn"
                                  : "Chờ"}
                          </div>
                        </div>
                        {index < EDITORIAL_WORKFLOW_STEPS.length - 1 ? (
                          <span className="admin-field-hint" aria-hidden>
                            ↓
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="admin-section-card" style={{ marginBottom: 16 }}>
              <div className="admin-section-header">
                <h2 className="admin-subtitle" style={{ margin: 0 }}>
                  Việc của tôi
                </h2>
                <span className="admin-field-hint">
                  {inboxGroups.reduce((sum, g) => sum + g.items.length, 0)} việc từ chủ đề ưu tiên
                </span>
              </div>
              {inboxGroups.length === 0 ? (
                <EmptyState
                  title="Không có việc ưu tiên ngay lúc này"
                  description="Khi có chủ đề ưu tiên hoặc quá hạn, danh sách việc sẽ xuất hiện tại đây."
                  action={
                    <Link href="/admin/content/seo-topics" className="admin-btn admin-btn--primary">
                      Xem tất cả chủ đề
                    </Link>
                  }
                />
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {inboxGroups.map(({ group, items }) => (
                    <div key={group}>
                      <h3 className="admin-sidebar-title" style={{ marginBottom: 8 }}>
                        {EDITORIAL_TASK_GROUP_LABELS[group]}
                      </h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {items.map((topic) => {
                          const next = getTopicNextAction(topic.status);
                          const tone = CONTENT_STATUS_COLORS[topicStatusTone(topic.status)];
                          return (
                            <article
                              key={topic.id}
                              className="admin-sidebar-card"
                              style={{ margin: 0, display: "grid", gap: 8 }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <Link href={`/admin/content/seo-topics/${topic.id}`} className="admin-link">
                                  <strong>{topic.title}</strong>
                                </Link>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    background: tone.bg,
                                    color: tone.fg,
                                    border: `1px solid ${tone.border}`,
                                    whiteSpace: "nowrap",
                                    height: "fit-content",
                                  }}
                                >
                                  {SEO_TOPIC_STATUS_LABELS[topic.status]}
                                </span>
                              </div>
                              <p className="admin-field-hint" style={{ margin: 0 }}>
                                {topic.cluster.strategy.name} · {topic.cluster.name}
                              </p>
                              <p className="admin-field-hint" style={{ margin: 0 }}>
                                Ưu tiên {SEO_TOPIC_PRIORITY_LABELS[topic.priority]}
                                {topic.dueDate ? ` · Hạn ${formatDate(topic.dueDate)}` : ""}
                              </p>
                              <div>
                                <Link href={next.href(topic.id)} className="admin-btn admin-btn--primary admin-btn--small">
                                  {next.label}
                                </Link>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {health ? (
              <section className="admin-section-card" style={{ marginBottom: 16 }}>
                <div className="admin-section-header">
                  <h2 className="admin-subtitle" style={{ margin: 0 }}>
                    Sức khỏe nội dung
                  </h2>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  <ProgressBar value={health.knowledge} label="Độ phủ kiến thức" />
                  <ProgressBar value={health.images} label="Hình ảnh sẵn sàng" />
                  <ProgressBar value={health.seo} label="SEO sẵn sàng" />
                  <ProgressBar value={health.review} label="Kiểm duyệt sẵn sàng" />
                  <ProgressBar value={health.publishing} label="Xuất bản sẵn sàng" />
                </div>
              </section>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <section className="admin-sidebar-card" style={{ margin: 0 }}>
                <h3 className="admin-sidebar-title">Chờ kiểm duyệt</h3>
                {openReviews.length === 0 ? (
                  <p className="admin-field-hint">Không có bài đang chờ kiểm duyệt.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                    {openReviews.slice(0, 6).map((review) => (
                      <li key={review.id} style={{ display: "grid", gap: 4 }}>
                        <Link href={`/admin/content/reviews/${review.id}`} className="admin-link">
                          {review.topicTitle ?? "Bản nháp không tên"}
                        </Link>
                        <span className="admin-field-hint">
                          QA {review.qaScore ?? "—"} · {review.blockingIssues} lỗi chặn ·{" "}
                          {formatRelative(review.updatedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 10 }}>
                  <Link href="/admin/content/reviews" className="admin-btn admin-btn--secondary admin-btn--small">
                    Mở hàng đợi kiểm duyệt
                  </Link>
                </div>
              </section>

              <section className="admin-sidebar-card" style={{ margin: 0 }}>
                <h3 className="admin-sidebar-title">Xuất bản</h3>
                <p className="admin-field-hint" style={{ margin: "0 0 8px" }}>
                  Sẵn sàng: {readyToPublish} · Vừa đăng: {recentlyPublished} · Lỗi:{" "}
                  {queues?.failed?.length ?? 0}
                </p>
                {(queues?.ready ?? []).slice(0, 4).map((row, index) => (
                  <div key={String(row.id ?? index)} className="admin-field-hint">
                    {String(row.title ?? row.id ?? "Bài viết")}
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <Link href="/admin/content/publishing" className="admin-btn admin-btn--secondary admin-btn--small">
                    Mở workspace xuất bản
                  </Link>
                </div>
              </section>

              <section className="admin-sidebar-card" style={{ margin: 0 }}>
                <h3 className="admin-sidebar-title">Sắp đến hạn</h3>
                {data.upcomingDue.length === 0 ? (
                  <p className="admin-field-hint">Không có chủ đề sắp đến hạn.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                    {data.upcomingDue.slice(0, 6).map((topic) => (
                      <li key={topic.id}>
                        <Link href={`/admin/content/seo-topics/${topic.id}`} className="admin-link">
                          {topic.title}
                        </Link>
                        <div className="admin-field-hint">
                          {formatDate(topic.dueDate)} · {SEO_TOPIC_STATUS_LABELS[topic.status]}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h3 className="admin-sidebar-title">Độ phủ cụm chủ đề</h3>
              {data.clusterCoverage.length === 0 ? (
                <EmptyState
                  title="Chưa có cụm chủ đề"
                  description="Tạo chiến lược và cụm chủ đề để theo dõi độ phủ nội dung."
                  action={
                    <Link href="/admin/content/seo-strategies" className="admin-btn admin-btn--primary">
                      Mở chiến lược
                    </Link>
                  }
                />
              ) : (
                <div className="admin-table-wrap admin-table-wrap--crm">
                  <table className="admin-table admin-table--crm admin-table--compact">
                    <thead>
                      <tr>
                        <th>Cụm</th>
                        <th>Chiến lược</th>
                        <th>Tổng</th>
                        <th>Đã XB</th>
                        <th>Đang làm</th>
                        <th>Chưa bắt đầu</th>
                        <th>Thiếu hình</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clusterCoverage.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.strategyName}</td>
                          <td>{row.total}</td>
                          <td>{row.published}</td>
                          <td>{row.inProgress}</td>
                          <td>{row.missing}</td>
                          <td>
                            {row.missingMedia > 0 ? (
                              <StatusBadge tone="warning">{row.missingMedia}</StatusBadge>
                            ) : (
                              "0"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
