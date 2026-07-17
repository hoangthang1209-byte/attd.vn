"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  COMPANY_REALITY_ICON_LABELS,
  COMPANY_REALITY_ICON_KEYS,
} from "@/features/home/homepage-cms-defaults";
import type {
  HomepageCompanyRealityConfig,
  HomepageCompanyRealityItemConfig,
} from "@/features/home/homepage.types";

type Props = {
  initial: HomepageCompanyRealityConfig;
};

function createEmptyItem(index: number): HomepageCompanyRealityItemConfig {
  return {
    itemKey: `custom-${Date.now()}-${index}`,
    title: "",
    description: "",
    iconKey: "BUILDING",
    featured: false,
    active: true,
    sortOrder: index + 1,
  };
}

function reorderItems(
  items: HomepageCompanyRealityItemConfig[],
  from: number,
  to: number,
): HomepageCompanyRealityItemConfig[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) return items;
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

function normalizeFeatured(
  items: HomepageCompanyRealityItemConfig[],
): HomepageCompanyRealityItemConfig[] {
  let featuredAssigned = false;
  return items.map((item) => {
    const featured = item.active && item.featured && !featuredAssigned;
    if (featured) featuredAssigned = true;
    return { ...item, featured };
  });
}

export default function HomepageCompanyRealitySettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  function update<K extends keyof HomepageCompanyRealityConfig>(
    field: K,
    value: HomepageCompanyRealityConfig[K],
  ) {
    markDirty();
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(index: number, patch: Partial<HomepageCompanyRealityItemConfig>) {
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

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.items.length) return;
    markDirty();
    setForm((prev) => ({ ...prev, items: reorderItems(prev.items, index, target) }));
  }

  function addItem() {
    markDirty();
    setForm((prev) => ({
      ...prev,
      items: normalizeFeatured([...prev.items, createEmptyItem(prev.items.length)]).map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      })),
    }));
  }

  function removeItem(index: number) {
    markDirty();
    setForm((prev) => ({
      ...prev,
      items: normalizeFeatured(prev.items.filter((_, itemIndex) => itemIndex !== index)).map((item, itemIndex) => ({
        ...item,
        sortOrder: itemIndex + 1,
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
      body: JSON.stringify({ panel: "companyReality", companyReality: form }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    const data = (await res.json()) as { companyReality?: HomepageCompanyRealityConfig };
    if (data.companyReality) setForm(data.companyReality);
    setDirty(false);
    setMessage({ type: "success", text: "Đã lưu ATTD trong thực tế." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <fieldset className="admin-catalog-fieldset">
        <legend>ATTD trong thực tế</legend>
        <p className="admin-field-hint">
          Các thông tin năng lực công ty đã được xác thực. Chỉ một mục có thể được đánh dấu nổi bật.
        </p>
        <p className="admin-field-hint">
          Trang chủ hiện hiển thị 1 mục nổi bật và tối đa 3 mục hỗ trợ. Các mục bổ sung vẫn được lưu trong CMS.
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
              onChange={(e) => update("layout", e.target.value as HomepageCompanyRealityConfig["layout"])}
            >
              <option value="FEATURED_PLUS_SUPPORTING">Một mục nổi bật + các mục phụ</option>
              <option value="FOUR_EQUAL_ITEMS">Bốn mục cân bằng</option>
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

        <div className="admin-sortable-list">
          {form.items.map((item, index) => (
            <article
              key={item.itemKey}
              className="admin-sortable-card"
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
                  <p className="admin-subtitle">Mục {index + 1}</p>
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

                <div className="admin-form-grid admin-form-grid--2">
                  <div className="admin-form-group">
                    <label>Tiêu đề mục</label>
                    <input
                      className="admin-input"
                      value={item.title}
                      onChange={(e) => updateItem(index, { title: e.target.value })}
                      required={item.active}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Biểu tượng</label>
                    <select
                      className="admin-input"
                      value={item.iconKey}
                      onChange={(e) =>
                        updateItem(index, {
                          iconKey: e.target.value as HomepageCompanyRealityItemConfig["iconKey"],
                        })
                      }
                    >
                      {COMPANY_REALITY_ICON_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {COMPANY_REALITY_ICON_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Mô tả mục</label>
                  <textarea
                    className="admin-textarea"
                    rows={2}
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    required={item.active}
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
                    Hiển thị
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="radio"
                      name="company-reality-featured"
                      checked={item.featured}
                      onChange={() => setFeatured(index)}
                    />
                    Mục nổi bật
                  </label>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button type="button" className="admin-btn admin-btn--secondary" onClick={addItem}>
          <Plus size={16} /> Thêm mục năng lực
        </button>

        <div className="admin-message admin-message--info">
          CMS: {form.items.length} mục · Public: 1 mục nổi bật + tối đa 3 mục hỗ trợ ·{" "}
          {form.items.find((item) => item.featured)?.title || "Chưa chọn mục nổi bật"}
        </div>
      </fieldset>

      {message && <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>}
      {dirty && !message ? <p className="admin-field-hint">Bạn có thay đổi chưa lưu.</p> : null}

      <AdminLoadingButton type="submit" variant="primary" pending={loading} pendingLabel="Đang lưu ATTD trong thực tế...">
        Lưu ATTD trong thực tế
      </AdminLoadingButton>
    </form>
  );
}
