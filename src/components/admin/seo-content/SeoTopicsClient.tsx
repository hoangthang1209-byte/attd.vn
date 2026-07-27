"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  SEO_CONTENT_TYPE_LABELS,
  SEO_FUNNEL_STAGE_LABELS,
  SEO_SEARCH_INTENT_LABELS,
  SEO_TOPIC_PRIORITY_LABELS,
  SEO_TOPIC_STATUS_LABELS,
} from "@/features/content/seo/seo-labels";
import {
  SEO_CONTENT_TYPES,
  SEO_FUNNEL_STAGES,
  SEO_SEARCH_INTENTS,
  SEO_TOPIC_PRIORITIES,
  SEO_TOPIC_STATUSES,
} from "@/features/content/seo/seo-api-utils";
import type {
  SeoContentType,
  SeoFunnelStage,
  SeoSearchIntent,
  SeoTopicPriority,
  SeoTopicStatus,
} from "@prisma/client";

type TopicRow = {
  id: string;
  title: string;
  primaryKeyword: string;
  status: SeoTopicStatus;
  priority: SeoTopicPriority;
  searchIntent: SeoSearchIntent;
  contentType: SeoContentType;
  funnelStage: SeoFunnelStage;
  strategyId: string;
  strategyName: string;
  clusterName: string;
  businessValue: number;
  dueDate: string | null;
  targetUrl: string | null;
  mediaPlanStatus: string | null;
};

type StrategyOption = { id: string; name: string };
type ClusterOption = { id: string; name: string; strategyId: string };

type CreateForm = {
  clusterId: string;
  title: string;
  primaryKeyword: string;
  searchIntent: SeoSearchIntent;
  contentType: SeoContentType;
  funnelStage: SeoFunnelStage;
  priority: SeoTopicPriority;
};

const QUICK_VIEW_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "idea", label: "Ý tưởng" },
  { value: "approved", label: "Đã duyệt" },
  { value: "brief", label: "Brief" },
  { value: "drafting", label: "Đang viết" },
  { value: "review", label: "Review" },
  { value: "published", label: "Đã xuất bản" },
  { value: "overdue", label: "Quá hạn" },
  { value: "missing-media", label: "Thiếu media" },
];

const emptyCreateForm = (): CreateForm => ({
  clusterId: "",
  title: "",
  primaryKeyword: "",
  searchIntent: "INFORMATIONAL",
  contentType: "BLOG_ARTICLE",
  funnelStage: "AWARENESS",
  priority: "NORMAL",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function SeoTopicsClient() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [filterStrategyId, setFilterStrategyId] = useState("");
  const [filterStatus, setFilterStatus] = useState<SeoTopicStatus | "">("");
  const [quickView, setQuickView] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<SeoTopicStatus | "">("");
  const [bulkPriority, setBulkPriority] = useState<SeoTopicPriority | "">("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm());
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadStrategies = useCallback(async () => {
    const res = await fetch("/api/content/seo/strategies");
    const data = (await res.json()) as { strategies?: StrategyOption[] };
    setStrategies(data.strategies ?? []);
  }, []);

  const loadClusters = useCallback(async (strategyId?: string) => {
    const params = new URLSearchParams();
    if (strategyId) params.set("strategyId", strategyId);
    params.set("activeOnly", "1");
    const res = await fetch(`/api/content/seo/clusters?${params.toString()}`);
    const data = (await res.json()) as { clusters?: ClusterOption[] };
    setClusters(data.clusters ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStrategyId) params.set("strategyId", filterStrategyId);
      if (filterStatus) params.set("status", filterStatus);
      if (quickView) params.set("quickView", quickView);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/content/seo/topics?${params.toString()}`);
      const data = (await res.json()) as { topics?: TopicRow[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải chủ đề");
      setRows(data.topics ?? []);
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải chủ đề");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterStrategyId, filterStatus, quickView, search, toast]);

  useEffect(() => {
    void loadStrategies();
  }, [loadStrategies]);

  useEffect(() => {
    void loadClusters(filterStrategyId || undefined);
  }, [filterStrategyId, loadClusters]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  async function handleBulkUpdate() {
    if (selected.size === 0) {
      toast.error("Chọn ít nhất một chủ đề.");
      return;
    }
    if (!bulkStatus && !bulkPriority) {
      toast.error("Chọn trạng thái hoặc ưu tiên để cập nhật.");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await fetch("/api/content/seo/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-update",
          ids: [...selected],
          ...(bulkStatus ? { status: bulkStatus } : {}),
          ...(bulkPriority ? { priority: bulkPriority } : {}),
        }),
      });
      const data = (await res.json()) as { updated?: number; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật hàng loạt");
      toast.success(`Đã cập nhật ${data.updated ?? 0} chủ đề`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật hàng loạt");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/content/seo/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = (await res.json()) as { topic?: { id: string }; message?: string };
      if (!res.ok || !data.topic) throw new Error(data.message ?? "Không thể tạo chủ đề");
      toast.success("Đã tạo chủ đề");
      setShowCreate(false);
      window.location.href = `/admin/content/seo-topics/${data.topic.id}`;
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Không thể tạo chủ đề");
    } finally {
      setCreateSaving(false);
    }
  }

  const exportHref = (() => {
    const params = new URLSearchParams();
    if (filterStrategyId) params.set("strategyId", filterStrategyId);
    return `/api/content/seo/topics/export?${params.toString()}`;
  })();

  const createClusters = filterStrategyId
    ? clusters.filter((c) => c.strategyId === filterStrategyId)
    : clusters;

  return (
    <>
      <AdminPageTitle title="Kế hoạch nội dung SEO" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>Lập kế hoạch, lọc và quản lý chủ đề SEO theo chiến lược và cụm.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/content/seo" className="admin-btn admin-btn--secondary">
              Dashboard
            </Link>
            <a href={exportHref} className="admin-btn admin-btn--secondary">
              Xuất CSV
            </a>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => {
                setCreateForm(emptyCreateForm());
                setCreateError(null);
                setShowCreate(true);
              }}
            >
              Tạo chủ đề
            </button>
          </div>
        </div>

        <div className="admin-catalog-filters">
          <input
            className="admin-input"
            placeholder="Tìm tiêu đề hoặc từ khóa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
          <select
            className="admin-input"
            value={filterStrategyId}
            onChange={(e) => setFilterStrategyId(e.target.value)}
          >
            <option value="">Tất cả chiến lược</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as SeoTopicStatus | "")}
          >
            <option value="">Tất cả trạng thái</option>
            {SEO_TOPIC_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SEO_TOPIC_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={quickView}
            onChange={(e) => setQuickView(e.target.value)}
          >
            {QUICK_VIEW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Lọc
          </button>
        </div>

        {selected.size > 0 && (
          <div className="admin-catalog-filters" style={{ marginBottom: 12 }}>
            <span className="admin-field-hint">Đã chọn {selected.size} chủ đề</span>
            <select
              className="admin-input"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as SeoTopicStatus | "")}
            >
              <option value="">— Trạng thái —</option>
              {SEO_TOPIC_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SEO_TOPIC_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              className="admin-input"
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value as SeoTopicPriority | "")}
            >
              <option value="">— Ưu tiên —</option>
              {SEO_TOPIC_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {SEO_TOPIC_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <AdminLoadingButton
              type="button"
              pending={bulkSaving}
              variant="primary"
              onClick={() => void handleBulkUpdate()}
            >
              Cập nhật hàng loạt
            </AdminLoadingButton>
          </div>
        )}

        {loading ? (
          <TableLoading
            title="Đang tải chủ đề…"
            description="Hệ thống đang tải kế hoạch nội dung SEO."
            tone="admin"
          />
        ) : rows.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có chủ đề nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Chủ đề</th>
                  <th>Từ khóa chính</th>
                  <th>Chiến lược / Cụm</th>
                  <th>Trạng thái</th>
                  <th>Ưu tiên</th>
                  <th>Hạn</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td>
                      <Link href={`/admin/content/seo-topics/${row.id}`} className="admin-link">
                        {row.title}
                      </Link>
                      <p className="admin-field-hint" style={{ margin: 0 }}>
                        {SEO_CONTENT_TYPE_LABELS[row.contentType]} ·{" "}
                        {SEO_SEARCH_INTENT_LABELS[row.searchIntent]}
                      </p>
                    </td>
                    <td>{row.primaryKeyword}</td>
                    <td>
                      {row.strategyName}
                      <p className="admin-field-hint" style={{ margin: 0 }}>
                        {row.clusterName}
                      </p>
                    </td>
                    <td>{SEO_TOPIC_STATUS_LABELS[row.status]}</td>
                    <td>{SEO_TOPIC_PRIORITY_LABELS[row.priority]}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td>
                      <Link
                        href={`/admin/content/seo-topics/${row.id}`}
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                      >
                        Mở
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="admin-modal-overlay" onClick={() => !createSaving && setShowCreate(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="admin-subtitle">Tạo chủ đề SEO</h3>
              <form onSubmit={(e) => void handleCreate(e)} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Cụm chủ đề</label>
                  <select
                    className="admin-input"
                    value={createForm.clusterId}
                    onChange={(e) => setCreateForm({ ...createForm, clusterId: e.target.value })}
                    required
                  >
                    <option value="">— Chọn cụm —</option>
                    {createClusters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Tiêu đề</label>
                  <input
                    className="admin-input"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Từ khóa chính</label>
                  <input
                    className="admin-input"
                    value={createForm.primaryKeyword}
                    onChange={(e) => setCreateForm({ ...createForm, primaryKeyword: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Search intent</label>
                  <select
                    className="admin-input"
                    value={createForm.searchIntent}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        searchIntent: e.target.value as SeoSearchIntent,
                      })
                    }
                  >
                    {SEO_SEARCH_INTENTS.map((intent) => (
                      <option key={intent} value={intent}>
                        {SEO_SEARCH_INTENT_LABELS[intent]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Loại nội dung</label>
                  <select
                    className="admin-input"
                    value={createForm.contentType}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contentType: e.target.value as SeoContentType,
                      })
                    }
                  >
                    {SEO_CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SEO_CONTENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Funnel</label>
                  <select
                    className="admin-input"
                    value={createForm.funnelStage}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        funnelStage: e.target.value as SeoFunnelStage,
                      })
                    }
                  >
                    {SEO_FUNNEL_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {SEO_FUNNEL_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Ưu tiên</label>
                  <select
                    className="admin-input"
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value as SeoTopicPriority,
                      })
                    }
                  >
                    {SEO_TOPIC_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {SEO_TOPIC_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
                {createError && <p className="admin-message admin-message--error">{createError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <AdminLoadingButton type="submit" pending={createSaving} variant="primary">
                    Tạo chủ đề
                  </AdminLoadingButton>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    disabled={createSaving}
                    onClick={() => setShowCreate(false)}
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
