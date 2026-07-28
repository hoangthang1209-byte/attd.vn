"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { SEO_STRATEGY_STATUS_LABELS } from "@/features/content/seo/seo-labels";
import type { SeoStrategyStatus } from "@prisma/client";

type StrategyDetail = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: SeoStrategyStatus;
  clusterCount: number;
  topicCount: number;
  publishedCount: number;
};

type ClusterRow = {
  id: string;
  parentId: string | null;
  name: string;
  pillarTopic: string | null;
  targetAudience: string[];
  businessGoals: string[];
  topicCount: number;
  childCount: number;
  isActive: boolean;
};

type HeaderForm = {
  name: string;
  code: string;
  description: string;
  status: SeoStrategyStatus;
};

type ClusterForm = {
  name: string;
  parentId: string;
  pillarTopic: string;
  targetAudience: string;
  businessGoals: string;
};

const emptyClusterForm = (): ClusterForm => ({
  name: "",
  parentId: "",
  pillarTopic: "",
  targetAudience: "",
  businessGoals: "",
});

export default function SeoStrategyDetailClient({ strategyId }: { strategyId: string }) {
  const toast = useAdminToast();
  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerForm, setHeaderForm] = useState<HeaderForm>({
    name: "",
    code: "",
    description: "",
    status: "DRAFT",
  });
  const [headerSaving, setHeaderSaving] = useState(false);
  const [showClusterForm, setShowClusterForm] = useState(false);
  const [clusterForm, setClusterForm] = useState<ClusterForm>(emptyClusterForm());
  const [clusterSaving, setClusterSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/seo/strategies/${strategyId}`);
      const data = (await res.json()) as {
        strategy?: StrategyDetail;
        clusters?: ClusterRow[];
        message?: string;
      };
      if (!res.ok || !data.strategy) throw new Error(data.message ?? "Không tìm thấy chiến lược");
      setStrategy(data.strategy);
      setClusters(data.clusters ?? []);
      setHeaderForm({
        name: data.strategy.name,
        code: data.strategy.code ?? "",
        description: data.strategy.description ?? "",
        status: data.strategy.status,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tìm thấy chiến lược");
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  }, [strategyId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const parentClusters = clusters.filter((c) => !c.parentId);

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    setHeaderSaving(true);
    try {
      const res = await fetch(`/api/content/seo/strategies/${strategyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: headerForm.name.trim(),
          code: headerForm.code.trim() || null,
          description: headerForm.description.trim() || null,
          status: headerForm.status,
        }),
      });
      const data = (await res.json()) as { strategy?: StrategyDetail; message?: string };
      if (!res.ok || !data.strategy) throw new Error(data.message ?? "Không thể lưu chiến lược");
      setStrategy(data.strategy);
      toast.success("Đã lưu chiến lược");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu chiến lược");
    } finally {
      setHeaderSaving(false);
    }
  }

  async function createCluster(e: React.FormEvent) {
    e.preventDefault();
    setClusterSaving(true);
    try {
      const res = await fetch("/api/content/seo/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          name: clusterForm.name.trim(),
          parentId: clusterForm.parentId || null,
          pillarTopic: clusterForm.pillarTopic.trim() || null,
          targetAudience: clusterForm.targetAudience
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          businessGoals: clusterForm.businessGoals
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo cụm");
      toast.success("Đã tạo cụm chủ đề");
      setShowClusterForm(false);
      setClusterForm(emptyClusterForm());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo cụm");
    } finally {
      setClusterSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <AdminPageTitle title="Chiến lược SEO" />
        <TableLoading
          title="Đang tải chiến lược…"
          description="Hệ thống đang tải thông tin chiến lược và cụm chủ đề."
          tone="admin"
        />
      </>
    );
  }

  if (!strategy) {
    return (
      <>
        <AdminPageTitle title="Chiến lược SEO" />
        <div className="admin-empty-state">
          <p>Không tìm thấy chiến lược.</p>
          <Link href="/admin/content/seo-strategies" className="admin-btn admin-btn--secondary">
            Quay lại danh sách
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageTitle title={strategy.name} />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>
            {strategy.topicCount} chủ đề · {strategy.clusterCount} cụm · {strategy.publishedCount} đã xuất bản
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/content/seo-strategies" className="admin-btn admin-btn--secondary">
              Danh sách chiến lược
            </Link>
            <Link
              href={`/admin/content/calendar?strategyId=${strategyId}`}
              className="admin-btn admin-btn--secondary"
            >
              Lịch biên tập
            </Link>
            <Link
              href={`/admin/content/seo-topics?strategyId=${strategyId}`}
              className="admin-btn admin-btn--primary"
            >
              Xem chủ đề
            </Link>
          </div>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Calendar preview</h3>
          <p className="admin-field-hint" style={{ margin: "0 0 8px" }}>
            Publishing timeline · {strategy.publishedCount}/{strategy.topicCount} published (
            {strategy.topicCount > 0
              ? Math.round((strategy.publishedCount / strategy.topicCount) * 100)
              : 0}
            %)
          </p>
          <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginBottom: 12 }}>
            <div
              style={{
                width: `${strategy.topicCount > 0 ? Math.round((strategy.publishedCount / strategy.topicCount) * 100) : 0}%`,
                height: "100%",
                background: "#047857",
              }}
            />
          </div>
          <h4 className="admin-sidebar-title" style={{ fontSize: 13 }}>
            Cluster completion
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {clusters.slice(0, 8).map((cluster) => (
              <li key={cluster.id} className="admin-field-hint">
                {cluster.name} · {cluster.topicCount} topics
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 10 }}>
            <Link
              href={`/admin/content/calendar?strategyId=${strategyId}&view=month`}
              className="admin-btn admin-btn--secondary admin-btn--small"
            >
              Open month calendar
            </Link>
          </div>
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Thông tin chiến lược</h3>
          <form onSubmit={(e) => void saveHeader(e)} className="admin-form">
            <div className="admin-field">
              <label className="admin-label">Tên</label>
              <input
                className="admin-input"
                value={headerForm.name}
                onChange={(e) => setHeaderForm({ ...headerForm, name: e.target.value })}
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã</label>
              <input
                className="admin-input"
                value={headerForm.code}
                onChange={(e) => setHeaderForm({ ...headerForm, code: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mô tả</label>
              <textarea
                className="admin-input"
                rows={3}
                value={headerForm.description}
                onChange={(e) => setHeaderForm({ ...headerForm, description: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Trạng thái</label>
              <select
                className="admin-input"
                value={headerForm.status}
                onChange={(e) =>
                  setHeaderForm({ ...headerForm, status: e.target.value as SeoStrategyStatus })
                }
              >
                {Object.entries(SEO_STRATEGY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <AdminLoadingButton type="submit" pending={headerSaving} variant="primary">
              Lưu chiến lược
            </AdminLoadingButton>
          </form>
        </div>

        <div className="admin-section-header">
          <h3 className="admin-subtitle">Cụm chủ đề</h3>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setClusterForm(emptyClusterForm());
              setShowClusterForm(true);
            }}
          >
            Tạo cụm
          </button>
        </div>

        {clusters.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có cụm chủ đề nào.</p>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>Tên cụm</th>
                  <th>Cấp</th>
                  <th>Pillar topic</th>
                  <th>Chủ đề</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((cluster) => {
                  const parent = cluster.parentId
                    ? clusters.find((c) => c.id === cluster.parentId)
                    : null;
                  return (
                    <tr key={cluster.id}>
                      <td>
                        {cluster.name}
                        {parent && (
                          <p className="admin-field-hint" style={{ margin: 0 }}>
                            Thuộc: {parent.name}
                          </p>
                        )}
                      </td>
                      <td>{cluster.parentId ? "Cấp 2" : "Cấp 1"}</td>
                      <td>{cluster.pillarTopic ?? "—"}</td>
                      <td>
                        {cluster.topicCount} chủ đề
                        {cluster.childCount > 0 && ` · ${cluster.childCount} cụm con`}
                      </td>
                      <td>{cluster.isActive ? "Đang dùng" : "Vô hiệu"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showClusterForm && (
          <div className="admin-modal-overlay" onClick={() => !clusterSaving && setShowClusterForm(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="admin-subtitle">Tạo cụm chủ đề</h3>
              <form onSubmit={(e) => void createCluster(e)} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Tên cụm</label>
                  <input
                    className="admin-input"
                    value={clusterForm.name}
                    onChange={(e) => setClusterForm({ ...clusterForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Cụm cha (cấp 1, tuỳ chọn)</label>
                  <select
                    className="admin-input"
                    value={clusterForm.parentId}
                    onChange={(e) => setClusterForm({ ...clusterForm, parentId: e.target.value })}
                  >
                    <option value="">— Cấp 1 (không có cha) —</option>
                    {parentClusters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Pillar topic</label>
                  <input
                    className="admin-input"
                    value={clusterForm.pillarTopic}
                    onChange={(e) => setClusterForm({ ...clusterForm, pillarTopic: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Đối tượng mục tiêu (phân cách bằng dấu phẩy)</label>
                  <input
                    className="admin-input"
                    value={clusterForm.targetAudience}
                    onChange={(e) => setClusterForm({ ...clusterForm, targetAudience: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Mục tiêu kinh doanh (phân cách bằng dấu phẩy)</label>
                  <input
                    className="admin-input"
                    value={clusterForm.businessGoals}
                    onChange={(e) => setClusterForm({ ...clusterForm, businessGoals: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <AdminLoadingButton type="submit" pending={clusterSaving} variant="primary">
                    Tạo cụm
                  </AdminLoadingButton>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    disabled={clusterSaving}
                    onClick={() => setShowClusterForm(false)}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
