"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import HomepageMediaAssetField from "@/components/admin/HomepageMediaAssetField";
import type {
  HomepageWorkshopGalleryConfig,
  HomepageWorkshopMediaConfig,
} from "@/features/home/homepage.types";

type Props = {
  initial: HomepageWorkshopGalleryConfig;
};

function createEmptyItem(index: number): HomepageWorkshopMediaConfig {
  return {
    id: `draft-${Date.now()}-${index}`,
    mediaAssetId: "",
    imageUrl: null,
    thumbnailUrl: null,
    caption: null,
    altText: null,
    featured: index === 0,
    active: true,
    sortOrder: index + 1,
    href: null,
  };
}

function reorderItems(
  items: HomepageWorkshopMediaConfig[],
  from: number,
  to: number,
): HomepageWorkshopMediaConfig[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) return items;
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function normalizeFeatured(items: HomepageWorkshopMediaConfig[]): HomepageWorkshopMediaConfig[] {
  let featuredAssigned = false;
  const normalized = items.map((item) => {
    const featured = item.active && item.featured && !featuredAssigned;
    if (featured) featuredAssigned = true;
    return { ...item, featured };
  });
  if (!featuredAssigned) {
    const index = normalized.findIndex((item) => item.active && item.mediaAssetId);
    if (index >= 0) normalized[index] = { ...normalized[index], featured: true };
  }
  return normalized.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function rejectNonOperationalAsset(asset: {
  filename: string;
  title?: string | null;
  caption?: string | null;
  useCaseTerms?: string[];
  subjectTerms?: string[];
  tags?: string[];
  keywords?: string[];
}): string | null {
  const tokens = [
    asset.filename,
    asset.title,
    asset.caption,
    ...(asset.useCaseTerms ?? []),
    ...(asset.subjectTerms ?? []),
    ...(asset.tags ?? []),
    ...(asset.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(model|catalog|catalogue|mockup|lifestyle|campaign|lookbook|product)/.test(tokens)) {
    return "Không dùng ảnh model/catalog";
  }
  return null;
}

export default function HomepageWorkshopGallerySettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const activeCount = useMemo(() => form.items.filter((item) => item.active && item.mediaAssetId).length, [form.items]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
    setMessage(null);
  }

  function update<K extends keyof HomepageWorkshopGalleryConfig>(
    field: K,
    value: HomepageWorkshopGalleryConfig[K],
  ) {
    markDirty();
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(index: number, patch: Partial<HomepageWorkshopMediaConfig>) {
    markDirty();
    setForm((prev) => ({
      ...prev,
      items: normalizeFeatured(
        prev.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      ),
    }));
  }

  function addItem() {
    markDirty();
    setForm((prev) => ({
      ...prev,
      items: normalizeFeatured([...prev.items, createEmptyItem(prev.items.length)]),
    }));
  }

  function removeItem(index: number) {
    markDirty();
    setForm((prev) => ({
      ...prev,
      items: normalizeFeatured(prev.items.filter((_, itemIndex) => itemIndex !== index)),
    }));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.items.length) return;
    markDirty();
    setForm((prev) => ({ ...prev, items: reorderItems(prev.items, index, target) }));
  }

  function setFeatured(index: number) {
    markDirty();
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => ({
        ...item,
        active: itemIndex === index ? true : item.active,
        featured: itemIndex === index,
      })),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/settings/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel: "workshopGallery", workshopGallery: form }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    const data = (await res.json()) as { workshopGallery?: HomepageWorkshopGalleryConfig };
    if (data.workshopGallery) setForm(data.workshopGallery);
    setDirty(false);
    setMessage({ type: "success", text: "Đã lưu Góc nhìn từ xưởng." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <fieldset className="admin-catalog-fieldset">
        <legend>Góc nhìn từ xưởng</legend>
        <p className="admin-field-hint">
          Chỉ chọn ảnh vận hành thật. Section public sẽ tự ẩn nếu không có ảnh hợp lệ đang bật.
        </p>

        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
          />
          Hiển thị section
        </label>

        <div className="admin-form-grid admin-form-grid--2">
          <div className="admin-form-group">
            <label>Nhãn giới thiệu</label>
            <input
              className="admin-input"
              value={form.eyebrow}
              onChange={(e) => update("eyebrow", e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label>Layout</label>
            <select
              className="admin-input"
              value={form.layout}
              onChange={(e) => update("layout", e.target.value as HomepageWorkshopGalleryConfig["layout"])}
            >
              <option value="EDITORIAL_GRID">Editorial</option>
              <option value="COMPACT_GRID">Grid gọn</option>
              <option value="HORIZONTAL_STRIP">Dải ngang</option>
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label>Tiêu đề</label>
          <input
            className="admin-input"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>
        <div className="admin-form-group">
          <label>Mô tả</label>
          <textarea
            className="admin-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label>Số ảnh tối đa</label>
          <input
            className="admin-input"
            type="number"
            min={1}
            max={12}
            value={form.maxItems}
            onChange={(e) => update("maxItems", Number(e.target.value))}
          />
          <p className="admin-field-hint">
            Đang có {activeCount} ảnh đang bật. Public chỉ hiển thị tối đa theo số này.
          </p>
        </div>

        <div className="admin-sortable-list">
          {form.items.map((item, index) => (
            <article
              key={item.id || `${item.mediaAssetId}-${index}`}
              className="admin-sortable-card admin-sortable-card--media"
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex == null || dragIndex === index) return;
                markDirty();
                setForm((prev) => ({ ...prev, items: reorderItems(prev.items, dragIndex, index) }));
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className="admin-sortable-card__handle" aria-hidden>
                <GripVertical size={16} />
              </div>
              <div className="admin-sortable-card__body">
                <div className="admin-sortable-card__header">
                  <p className="admin-subtitle">Ảnh {index + 1}</p>
                  <div className="admin-sortable-card__actions">
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp size={14} /> Lên
                    </button>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => move(index, 1)} disabled={index === form.items.length - 1}>
                      <ArrowDown size={14} /> Xuống
                    </button>
                    <button type="button" className="admin-btn admin-btn--danger admin-btn--xs" onClick={() => removeItem(index)}>
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>

                <HomepageMediaAssetField
                  label="Ảnh vận hành"
                  folder={null}
                  value={{
                    mediaAssetId: item.mediaAssetId || null,
                    imageUrl: item.thumbnailUrl ?? item.imageUrl,
                    imageAlt: item.altText,
                  }}
                  emptyHint="Chưa chọn ảnh — section public sẽ không hiển thị ảnh này."
                  rejectAsset={rejectNonOperationalAsset}
                  onChange={(media) =>
                    updateItem(index, {
                      mediaAssetId: media.mediaAssetId ?? "",
                      imageUrl: media.imageUrl,
                      thumbnailUrl: media.imageUrl,
                      altText: media.imageAlt,
                    })
                  }
                />

                <div className="admin-form-group">
                  <label>Caption</label>
                  <input
                    className="admin-input"
                    value={item.caption ?? ""}
                    onChange={(e) => updateItem(index, { caption: e.target.value || null })}
                    placeholder="Ví dụ: Kiểm tra chất lượng trước khi đóng gói"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Alt text</label>
                  <input
                    className="admin-input"
                    value={item.altText ?? ""}
                    onChange={(e) => updateItem(index, { altText: e.target.value || null })}
                    placeholder="Mô tả ngắn nội dung ảnh"
                  />
                </div>

                <div className="admin-inline-options">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) =>
                        updateItem(index, {
                          active: e.target.checked,
                          featured: e.target.checked ? item.featured : false,
                        })
                      }
                    />
                    Hiển thị ảnh
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="radio"
                      name="workshop-featured"
                      checked={item.featured}
                      onChange={() => setFeatured(index)}
                    />
                    Ảnh nổi bật
                  </label>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button type="button" className="admin-btn admin-btn--secondary" onClick={addItem}>
          <Plus size={16} /> Chọn ảnh từ Thư viện Media
        </button>
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}
      {dirty && !message ? <p className="admin-field-hint">Bạn có thay đổi chưa lưu.</p> : null}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu Góc nhìn từ xưởng...">
        Lưu Góc nhìn từ xưởng
      </AdminLoadingButton>
    </form>
  );
}
