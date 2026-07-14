"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
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

const COUNT_CARDS: Array<{ key: keyof DashboardCounts; label: string }> = [
  { key: "activeStrategies", label: "Chiến lược đang hoạt động" },
  { key: "totalTopics", label: "Tổng chủ đề" },
  { key: "approvedTopics", label: "Đã duyệt" },
  { key: "briefReadyTopics", label: "Sẵn sàng brief" },
  { key: "draftingTopics", label: "Đang viết" },
  { key: "reviewTopics", label: "Đang review" },
  { key: "publishedTopics", label: "Đã xuất bản" },
  { key: "overdueTopics", label: "Quá hạn" },
  { key: "missingMediaTopics", label: "Thiếu media" },
  { key: "noTargetUrlTopics", label: "Chưa có URL đích" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function SeoDashboardClient() {
  const toast = useAdminToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/seo/dashboard");
      const json = (await res.json()) as { dashboard?: DashboardData; message?: string };
      if (!res.ok || !json.dashboard) throw new Error(json.message ?? "Không thể tải dashboard SEO");
      setData(json.dashboard);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải dashboard SEO");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageTitle title="SEO Content Platform" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>Tổng quan kế hoạch nội dung SEO, tiến độ cụm chủ đề và chủ đề ưu tiên.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/content/seo-strategies" className="admin-btn admin-btn--secondary">
              Chiến lược SEO
            </Link>
            <Link href="/admin/content/seo-topics" className="admin-btn admin-btn--primary">
              Kế hoạch nội dung
            </Link>
          </div>
        </div>

        {loading ? (
          <TableLoading
            title="Đang tải dashboard SEO…"
            description="Hệ thống đang tổng hợp số liệu chiến lược và chủ đề."
            tone="admin"
          />
        ) : !data ? (
          <div className="admin-empty-state">
            <p>Không thể tải dữ liệu dashboard.</p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {COUNT_CARDS.map(({ key, label }) => (
                <div key={key} className="admin-sidebar-card" style={{ margin: 0, textAlign: "center" }}>
                  <p className="admin-field-hint" style={{ margin: "0 0 4px" }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{data.counts[key]}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div className="admin-sidebar-card" style={{ margin: 0 }}>
                <h3 className="admin-sidebar-title">Chủ đề ưu tiên</h3>
                {data.priorityTopics.length === 0 ? (
                  <p className="admin-field-hint">Chưa có chủ đề ưu tiên.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-table--crm">
                      <thead>
                        <tr>
                          <th>Chủ đề</th>
                          <th>Trạng thái</th>
                          <th>Ưu tiên</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.priorityTopics.map((topic) => (
                          <tr key={topic.id}>
                            <td>
                              <Link href={`/admin/content/seo-topics/${topic.id}`} className="admin-link">
                                {topic.title}
                              </Link>
                              <p className="admin-field-hint" style={{ margin: 0 }}>
                                {topic.cluster.strategy.name} · {topic.cluster.name}
                              </p>
                            </td>
                            <td>{SEO_TOPIC_STATUS_LABELS[topic.status]}</td>
                            <td>{SEO_TOPIC_PRIORITY_LABELS[topic.priority]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="admin-sidebar-card" style={{ margin: 0 }}>
                <h3 className="admin-sidebar-title">Sắp đến hạn</h3>
                {data.upcomingDue.length === 0 ? (
                  <p className="admin-field-hint">Không có chủ đề sắp đến hạn.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-table--crm">
                      <thead>
                        <tr>
                          <th>Chủ đề</th>
                          <th>Hạn</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.upcomingDue.map((topic) => (
                          <tr key={topic.id}>
                            <td>
                              <Link href={`/admin/content/seo-topics/${topic.id}`} className="admin-link">
                                {topic.title}
                              </Link>
                              <p className="admin-field-hint" style={{ margin: 0 }}>
                                {topic.cluster.name}
                              </p>
                            </td>
                            <td>{formatDate(topic.dueDate)}</td>
                            <td>{SEO_TOPIC_STATUS_LABELS[topic.status]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-sidebar-card" style={{ margin: 0 }}>
              <h3 className="admin-sidebar-title">Độ phủ cụm chủ đề</h3>
              {data.clusterCoverage.length === 0 ? (
                <p className="admin-field-hint">Chưa có cụm chủ đề nào.</p>
              ) : (
                <div className="admin-table-wrap admin-table-wrap--crm">
                  <table className="admin-table admin-table--crm">
                    <thead>
                      <tr>
                        <th>Cụm</th>
                        <th>Chiến lược</th>
                        <th>Tổng</th>
                        <th>Đã XB</th>
                        <th>Đang làm</th>
                        <th>Chưa bắt đầu</th>
                        <th>GT TB</th>
                        <th>Thiếu media</th>
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
                          <td>{row.avgBusinessValue}</td>
                          <td>{row.missingMedia}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
