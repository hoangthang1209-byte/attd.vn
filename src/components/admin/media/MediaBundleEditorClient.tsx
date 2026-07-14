"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { InlineLoading, TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  MEDIA_BUNDLE_CONTENT_TYPES,
  MEDIA_BUNDLE_CONTENT_TYPE_LABELS,
  MEDIA_BUNDLE_SLOT_TYPES,
  MEDIA_BUNDLE_SLOT_TYPE_LABELS,
} from "@/features/media/media-bundle-presets";
import type {
  MediaBundleDetail,
  MediaBundleHealthStatus,
  MediaBundleSlotDetail,
} from "@/features/media/services/media-bundle.service";
import type {
  MediaBundleContentType,
  MediaBundleSlotType,
  MediaBundleStatus,
} from "@prisma/client";

const STATUS_LABELS: Record<MediaBundleStatus, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng",
  ARCHIVED: "Đã lưu trữ",
};

const HEALTH_LABELS: Record<MediaBundleHealthStatus, string> = {
  INCOMPLETE: "Chưa đủ",
  BASIC: "Cơ bản",
  READY: "Sẵn sàng",
  EXCELLENT: "Xuất sắc",
};

function healthBadgeStyle(status: MediaBundleHealthStatus): React.CSSProperties {
  switch (status) {
    case "EXCELLENT":
      return { background: "#dcfce7", color: "#166534" };
    case "READY":
      return { background: "#dbeafe", color: "#1e40af" };
    case "BASIC":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#fee2e2", color: "#991b1b" };
  }
}

type SuggestionItem = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  altText: string | null;
  library: { code: string; name: string } | null;
  role: { code: string; name: string } | null;
  subjectTerms?: string[];
  contentSuitabilities?: string[];
  seoScore?: number;
  score: number;
  matchedOn: string[];
};

type HeaderForm = {
  name: string;
  code: string;
  description: string;
  query: string;
};

type NewSlotForm = {
  slotType: MediaBundleSlotType;
  label: string;
  required: boolean;
  minAssets: string;
  maxAssets: string;
};

const emptyNewSlotForm = (): NewSlotForm => ({
  slotType: "GALLERY",
  label: "",
  required: false,
  minAssets: "1",
  maxAssets: "",
});

export default function MediaBundleEditorClient({ bundleId }: { bundleId: string }) {
  const toast = useAdminToast();
  const [bundle, setBundle] = useState<MediaBundleDetail | null>(null);
  const [consumers, setConsumers] = useState<
    Array<{ id: string; title: string; status: string; route: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState<HeaderForm>({
    name: "",
    code: "",
    description: "",
    query: "",
  });
  const [headerSaving, setHeaderSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [presetMode, setPresetMode] = useState<"add-missing" | "replace-empty">("add-missing");
  const [presetApplying, setPresetApplying] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const [showNewSlotForm, setShowNewSlotForm] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState<NewSlotForm>(emptyNewSlotForm());
  const [slotSaving, setSlotSaving] = useState(false);

  const [openSuggestSlotId, setOpenSuggestSlotId] = useState<string | null>(null);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestItems, setSuggestItems] = useState<SuggestionItem[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSelected, setSuggestSelected] = useState<Set<string>>(new Set());
  const [addingAssets, setAddingAssets] = useState(false);

  const [slotActionBusy, setSlotActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundleId}`);
      const data = (await res.json()) as {
        bundle?: MediaBundleDetail;
        message?: string;
        consumers?: { blogPosts?: Array<{ id: string; title: string; status: string; route: string }> };
      };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không tìm thấy bộ media");
      setBundle(data.bundle);
      setConsumers(data.consumers?.blogPosts ?? []);
      setHeaderForm({
        name: data.bundle.name,
        code: data.bundle.code ?? "",
        description: data.bundle.description ?? "",
        query: data.bundle.query ?? "",
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không tìm thấy bộ media");
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    if (!bundle) return;
    setHeaderSaving(true);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: headerForm.name.trim(),
          code: headerForm.code.trim() || null,
          description: headerForm.description.trim() || null,
          query: headerForm.query.trim() || null,
        }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể lưu thông tin bộ media");
      setBundle(data.bundle);
      toast.success("Đã lưu thông tin bộ media");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu thông tin bộ media");
    } finally {
      setHeaderSaving(false);
    }
  }

  async function updateContentType(contentType: MediaBundleContentType) {
    if (!bundle) return;
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể cập nhật loại nội dung");
      setBundle(data.bundle);
      toast.success("Đã cập nhật loại nội dung");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật loại nội dung");
    }
  }

  async function updateStatus(status: MediaBundleStatus) {
    if (!bundle) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể cập nhật trạng thái");
      setBundle(data.bundle);
      toast.success("Đã cập nhật trạng thái");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật trạng thái");
    } finally {
      setStatusSaving(false);
    }
  }

  async function toggleActive() {
    if (!bundle) return;
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !bundle.isActive }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể cập nhật kích hoạt");
      setBundle(data.bundle);
      toast.success(bundle.isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật kích hoạt");
    }
  }

  async function applyPreset() {
    if (!bundle) return;
    setPresetApplying(true);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}/apply-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: presetMode }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể áp dụng mẫu vị trí");
      setBundle(data.bundle);
      toast.success("Đã áp dụng mẫu vị trí");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể áp dụng mẫu vị trí");
    } finally {
      setPresetApplying(false);
    }
  }

  async function duplicateBundle() {
    if (!bundle) return;
    setDuplicating(true);
    try {
      const includeAssets = window.confirm(
        "Sao chép luôn ảnh đã gán vào các vị trí? (OK = có, Cancel = chỉ sao chép cấu trúc vị trí)",
      );
      const res = await fetch(`/api/content/media-bundles/${bundle.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeAssets }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể sao chép bộ media");
      toast.success("Đã sao chép bộ media");
      window.location.href = `/admin/content/media-bundles/${data.bundle.id}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể sao chép bộ media");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!bundle) return;
    const label = newSlotForm.label.trim();
    if (!label) {
      toast.error("Nhãn vị trí là bắt buộc");
      return;
    }
    setSlotSaving(true);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotType: newSlotForm.slotType,
          label,
          required: newSlotForm.required,
          minAssets: Number.parseInt(newSlotForm.minAssets, 10) || 1,
          maxAssets: newSlotForm.maxAssets.trim()
            ? Number.parseInt(newSlotForm.maxAssets, 10)
            : null,
        }),
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể tạo vị trí");
      setBundle(data.bundle);
      setShowNewSlotForm(false);
      setNewSlotForm(emptyNewSlotForm());
      toast.success("Đã tạo vị trí mới");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo vị trí");
    } finally {
      setSlotSaving(false);
    }
  }

  async function handleDeleteSlot(slot: MediaBundleSlotDetail) {
    if (!bundle) return;
    if (!window.confirm(`Xóa vị trí "${slot.label}"? Ảnh vẫn được giữ trong thư viện.`)) return;
    setSlotActionBusy(slot.id);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundle.id}/slots/${slot.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể xóa vị trí");
      setBundle(data.bundle);
      toast.success("Đã xóa vị trí");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa vị trí");
    } finally {
      setSlotActionBusy(null);
    }
  }

  async function handleRemoveAsset(slot: MediaBundleSlotDetail, mediaAssetId: string) {
    if (!bundle) return;
    setSlotActionBusy(`${slot.id}:${mediaAssetId}`);
    try {
      const res = await fetch(
        `/api/content/media-bundles/${bundle.id}/slots/${slot.id}/assets/${mediaAssetId}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể gỡ ảnh");
      setBundle(data.bundle);
      toast.success("Đã gỡ ảnh khỏi vị trí");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể gỡ ảnh");
    } finally {
      setSlotActionBusy(null);
    }
  }

  async function moveAsset(slot: MediaBundleSlotDetail, index: number, direction: -1 | 1) {
    if (!bundle) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slot.assets.length) return;
    const orderedIds = slot.assets.map((a) => a.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(targetIndex, 0, moved);
    setSlotActionBusy(`${slot.id}:reorder`);
    try {
      const res = await fetch(
        `/api/content/media-bundles/${bundle.id}/slots/${slot.id}/assets/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedMediaAssetIds: orderedIds }),
        },
      );
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể sắp xếp lại ảnh");
      setBundle(data.bundle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể sắp xếp lại ảnh");
    } finally {
      setSlotActionBusy(null);
    }
  }

  function openSuggest(slot: MediaBundleSlotDetail) {
    setOpenSuggestSlotId((prev) => (prev === slot.id ? null : slot.id));
    setSuggestQuery("");
    setSuggestItems([]);
    setSuggestSelected(new Set());
  }

  const runSuggest = useCallback(
    async (slotId: string, query: string) => {
      if (!bundle) return;
      setSuggestLoading(true);
      try {
        const res = await fetch(
          `/api/content/media-bundles/${bundle.id}/slots/${slotId}/suggest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query || undefined, limit: 16 }),
          },
        );
        const data = (await res.json()) as { items?: SuggestionItem[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải gợi ý ảnh");
        setSuggestItems(data.items ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể tải gợi ý ảnh");
        setSuggestItems([]);
      } finally {
        setSuggestLoading(false);
      }
    },
    [bundle, toast],
  );

  useEffect(() => {
    if (!openSuggestSlotId) return;
    const handle = window.setTimeout(() => {
      void runSuggest(openSuggestSlotId, suggestQuery);
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSuggestSlotId, suggestQuery]);

  function toggleSuggestSelect(id: string) {
    setSuggestSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelectedAssets(slot: MediaBundleSlotDetail) {
    if (!bundle || suggestSelected.size === 0) return;
    setAddingAssets(true);
    try {
      const res = await fetch(
        `/api/content/media-bundles/${bundle.id}/slots/${slot.id}/assets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaAssetIds: [...suggestSelected] }),
        },
      );
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể thêm ảnh vào vị trí");
      setBundle(data.bundle);
      toast.success(`Đã thêm ${suggestSelected.size} ảnh vào vị trí "${slot.label}"`);
      setSuggestSelected(new Set());
      await runSuggest(slot.id, suggestQuery);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể thêm ảnh vào vị trí");
    } finally {
      setAddingAssets(false);
    }
  }

  if (loading) {
    return (
      <>
        <AdminPageTitle title="Gói nội dung hình ảnh" />
        <TableLoading title="Đang tải bộ media…" tone="admin" />
      </>
    );
  }

  if (loadError || !bundle) {
    return (
      <>
        <AdminPageTitle title="Gói nội dung hình ảnh" />
        <div className="admin-panel">
          <p className="admin-message admin-message--error">
            {loadError ?? "Không tìm thấy bộ media"}
          </p>
          <Link href="/admin/content/media-bundles" className="admin-btn admin-btn--secondary">
            Về danh sách
          </Link>
        </div>
      </>
    );
  }

  const health = bundle.health;

  return (
    <>
      <AdminPageTitle title={`Gói nội dung hình ảnh — ${bundle.name}`} />
      <div className="admin-panel">
        <div className="admin-section-header">
          <Link href="/admin/content/media-bundles" className="admin-link">
            ← Về danh sách bộ media
          </Link>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => void toggleActive()}
            >
              {bundle.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
            </button>
            <AdminLoadingButton
              pending={duplicating}
              variant="secondary"
              size="xs"
              onClick={() => void duplicateBundle()}
            >
              Sao chép bộ media
            </AdminLoadingButton>
          </div>
        </div>

        <div className="admin-field-hint" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span className="admin-badge">{STATUS_LABELS[bundle.status]}</span>
          <span className="admin-badge" style={healthBadgeStyle(health.status)}>
            Sức khỏe: {HEALTH_LABELS[health.status]} ({health.score}/100)
          </span>
          <span className="admin-badge">{bundle.slotCount} vị trí</span>
          <span className="admin-badge">{bundle.assetCount} ảnh</span>
          {bundle.isSystem && <span className="admin-badge">Hệ thống</span>}
        </div>

        <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-sidebar-title">Đang được sử dụng bởi</h3>
          {consumers.length === 0 ? (
            <p className="admin-field-hint">Chưa có bài viết Blog liên kết Bundle này.</p>
          ) : (
            <ul className="admin-checkbox-list">
              {consumers.map((post) => (
                <li key={post.id}>
                  <Link href={post.route} className="admin-link">
                    {post.title}
                  </Link>{" "}
                  <span className="admin-badge">{post.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={(e) => void saveHeader(e)} className="admin-form">
          <div className="admin-field">
            <label className="admin-label">Tên bộ media</label>
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
              rows={2}
              value={headerForm.description}
              onChange={(e) => setHeaderForm({ ...headerForm, description: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Từ khóa tìm ảnh (query gợi ý)</label>
            <input
              className="admin-input"
              value={headerForm.query}
              onChange={(e) => setHeaderForm({ ...headerForm, query: e.target.value })}
              placeholder="ví dụ: áo thun đồng phục xưởng may"
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="admin-field" style={{ minWidth: 220 }}>
              <label className="admin-label">Loại nội dung</label>
              <select
                className="admin-input"
                value={bundle.contentType}
                onChange={(e) => void updateContentType(e.target.value as MediaBundleContentType)}
              >
                {MEDIA_BUNDLE_CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MEDIA_BUNDLE_CONTENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field" style={{ minWidth: 220 }}>
              <label className="admin-label">Trạng thái</label>
              <select
                className="admin-input"
                value={bundle.status}
                disabled={statusSaving}
                onChange={(e) => void updateStatus(e.target.value as MediaBundleStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <AdminLoadingButton type="submit" pending={headerSaving} variant="primary">
              Lưu thông tin
            </AdminLoadingButton>
          </div>
        </form>

        {(health.missingRequiredSlots.length > 0 ||
          health.underfilledSlots.length > 0 ||
          health.privateAssetWarnings > 0 ||
          health.duplicateAssetWarnings > 0) && (
          <div className="admin-catalog-fieldset" style={{ marginTop: 12 }}>
            <h4 className="admin-subtitle">Cảnh báo sức khỏe bộ media</h4>
            <ul className="admin-field-hint" style={{ margin: 0, paddingLeft: 18 }}>
              {health.missingRequiredSlots.map((slot) => (
                <li key={`missing-${slot.slotId}`}>Thiếu ảnh bắt buộc cho vị trí &quot;{slot.label}&quot;</li>
              ))}
              {health.underfilledSlots.map((slot) => (
                <li key={`under-${slot.slotId}`}>Vị trí &quot;{slot.label}&quot; chưa đủ số ảnh khuyến nghị</li>
              ))}
              {health.privateAssetWarnings > 0 && (
                <li>{health.privateAssetWarnings} ảnh đang ở chế độ riêng tư (PRIVATE)</li>
              )}
              {health.duplicateAssetWarnings > 0 && (
                <li>{health.duplicateAssetWarnings} ảnh có khả năng trùng lặp</li>
              )}
            </ul>
          </div>
        )}

        <div className="admin-catalog-fieldset" style={{ marginTop: 12 }}>
          <h4 className="admin-subtitle">Áp dụng mẫu vị trí (preset)</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="admin-input admin-input--sm"
              value={presetMode}
              onChange={(e) => setPresetMode(e.target.value as "add-missing" | "replace-empty")}
            >
              <option value="add-missing">Thêm các vị trí còn thiếu theo mẫu</option>
              <option value="replace-empty">Tạo toàn bộ vị trí theo mẫu (chỉ khi chưa có vị trí)</option>
            </select>
            <AdminLoadingButton
              pending={presetApplying}
              variant="secondary"
              onClick={() => void applyPreset()}
            >
              Áp dụng mẫu
            </AdminLoadingButton>
          </div>
        </div>

        <div className="admin-section-header" style={{ marginTop: 16 }}>
          <h3 className="admin-subtitle" style={{ margin: 0 }}>
            Vị trí ảnh ({bundle.slots.length})
          </h3>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--xs"
            onClick={() => setShowNewSlotForm((v) => !v)}
          >
            {showNewSlotForm ? "Đóng" : "Thêm vị trí"}
          </button>
        </div>

        {showNewSlotForm && (
          <form onSubmit={(e) => void handleCreateSlot(e)} className="admin-catalog-fieldset admin-form">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="admin-field" style={{ minWidth: 180 }}>
                <label className="admin-label">Loại vị trí</label>
                <select
                  className="admin-input"
                  value={newSlotForm.slotType}
                  onChange={(e) =>
                    setNewSlotForm({ ...newSlotForm, slotType: e.target.value as MediaBundleSlotType })
                  }
                >
                  {MEDIA_BUNDLE_SLOT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MEDIA_BUNDLE_SLOT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field" style={{ minWidth: 200, flex: 1 }}>
                <label className="admin-label">Nhãn vị trí</label>
                <input
                  className="admin-input"
                  value={newSlotForm.label}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, label: e.target.value })}
                  required
                />
              </div>
              <div className="admin-field" style={{ width: 110 }}>
                <label className="admin-label">Số ảnh tối thiểu</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={newSlotForm.minAssets}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, minAssets: e.target.value })}
                />
              </div>
              <div className="admin-field" style={{ width: 110 }}>
                <label className="admin-label">Số ảnh tối đa</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={newSlotForm.maxAssets}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, maxAssets: e.target.value })}
                  placeholder="Không giới hạn"
                />
              </div>
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={newSlotForm.required}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, required: e.target.checked })}
                />
                Bắt buộc
              </label>
            </div>
            <AdminLoadingButton type="submit" pending={slotSaving} variant="primary">
              Tạo vị trí
            </AdminLoadingButton>
          </form>
        )}

        {bundle.slots.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có vị trí ảnh nào. Áp dụng mẫu hoặc thêm vị trí mới.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bundle.slots.map((slot) => {
              const isSuggestOpen = openSuggestSlotId === slot.id;
              const slotBusyDelete = slotActionBusy === slot.id;
              return (
                <div key={slot.id} className="admin-catalog-fieldset">
                  <div className="admin-section-header" style={{ marginBottom: 4 }}>
                    <div>
                      <strong>{slot.label}</strong>{" "}
                      <span className="admin-badge">{MEDIA_BUNDLE_SLOT_TYPE_LABELS[slot.slotType]}</span>{" "}
                      {slot.required && <span className="admin-badge">Bắt buộc</span>}{" "}
                      <span className="admin-field-hint">
                        {slot.assets.length}/{slot.minAssets}
                        {slot.maxAssets ? `–${slot.maxAssets}` : "+"} ảnh
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => openSuggest(slot)}
                      >
                        {isSuggestOpen ? "Đóng gợi ý" : "Gợi ý & thêm ảnh"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        style={{ color: "#dc2626" }}
                        disabled={slotBusyDelete}
                        onClick={() => void handleDeleteSlot(slot)}
                      >
                        Xóa vị trí
                      </button>
                    </div>
                  </div>

                  {slot.assets.length === 0 ? (
                    <p className="admin-field-hint">Chưa có ảnh trong vị trí này.</p>
                  ) : (
                    <div className="admin-media-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                      {slot.assets.map((asset, index) => {
                        const busyKey = `${slot.id}:${asset.id}`;
                        const busy = slotActionBusy === busyKey || slotActionBusy === `${slot.id}:reorder`;
                        return (
                          <div key={asset.id} className="admin-media-card">
                            <div className="admin-media-preview">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={asset.thumbnailUrl ?? asset.url} alt={asset.altText ?? asset.title ?? ""} />
                            </div>
                            <div className="admin-media-meta">
                              <p className="admin-field-hint" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {asset.library && <span className="admin-badge">{asset.library}</span>}
                                {asset.role && <span className="admin-badge">{asset.role}</span>}
                                <span className="admin-badge">SEO {asset.seoScore}</span>
                                {asset.visibility !== "PUBLIC" && (
                                  <span className="admin-badge">{asset.visibility}</span>
                                )}
                              </p>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--secondary admin-btn--xs"
                                  disabled={busy || index === 0}
                                  onClick={() => void moveAsset(slot, index, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--secondary admin-btn--xs"
                                  disabled={busy || index === slot.assets.length - 1}
                                  onClick={() => void moveAsset(slot, index, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--secondary admin-btn--xs"
                                  style={{ color: "#dc2626" }}
                                  disabled={busy}
                                  onClick={() => void handleRemoveAsset(slot, asset.id)}
                                >
                                  Gỡ
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isSuggestOpen && (
                    <div className="admin-media-suggestion-panel" style={{ marginTop: 10 }}>
                      <div className="admin-section-header">
                        <input
                          className="admin-input admin-input--sm"
                          placeholder="Tìm ảnh theo từ khóa…"
                          value={suggestQuery}
                          onChange={(e) => setSuggestQuery(e.target.value)}
                        />
                        <AdminLoadingButton
                          pending={addingAssets}
                          variant="primary"
                          size="xs"
                          disabled={suggestSelected.size === 0}
                          onClick={() => void addSelectedAssets(slot)}
                        >
                          Thêm {suggestSelected.size > 0 ? `(${suggestSelected.size})` : ""} ảnh đã chọn
                        </AdminLoadingButton>
                      </div>
                      {suggestLoading && <InlineLoading title="Đang tìm ảnh phù hợp…" tone="admin" />}
                      {!suggestLoading && suggestItems.length === 0 && (
                        <p className="admin-field-hint">Không có gợi ý phù hợp.</p>
                      )}
                      <div className="admin-media-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                        {suggestItems.map((item) => {
                          const alreadyInSlot = slot.assets.some((a) => a.id === item.id);
                          const checked = suggestSelected.has(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`admin-media-card admin-media-card--selectable ${checked ? "is-selected" : ""}`}
                              disabled={alreadyInSlot}
                              onClick={() => toggleSuggestSelect(item.id)}
                            >
                              <div className="admin-media-preview">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.thumbnailUrl ?? item.url} alt={item.altText ?? item.title ?? ""} />
                              </div>
                              <div className="admin-media-meta">
                                <p className="admin-field-hint" style={{ margin: 0 }}>
                                  {alreadyInSlot ? "Đã có trong vị trí" : `điểm ${item.score}`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
