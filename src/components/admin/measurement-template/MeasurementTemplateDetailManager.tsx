"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  PageHeader,
  SectionCard,
} from "@/components/admin/AdminUi";

type TemplateItem = {
  clientKey: string;
  pointOfMeasure: string;
  description: string;
  tolerance: string;
  valuesText: string;
  sortOrder: number;
};

type TemplateDetail = {
  id: string;
  code: string;
  name: string;
  baseSize: string | null;
  notes: string | null;
  productCategoryId: string | null;
  productCategory?: { id: string; name: string } | null;
  items: Array<{
    id: string;
    pointOfMeasure: string;
    description: string | null;
    tolerance: string | null;
    sortOrder: number;
    values: Array<{ size: string; value: string }>;
  }>;
};

function toItems(items: TemplateDetail["items"]): TemplateItem[] {
  return items.map((item) => ({
    clientKey: item.id,
    pointOfMeasure: item.pointOfMeasure,
    description: item.description ?? "",
    tolerance: item.tolerance ?? "",
    valuesText: item.values.map((v) => `${v.size}:${v.value}`).join(", "),
    sortOrder: item.sortOrder,
  }));
}

function parseValues(text: string) {
  return text
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [size, ...rest] = part.split(":");
      return { size: size.trim(), value: rest.join(":").trim() };
    })
    .filter((v) => v.size && v.value);
}

export default function MeasurementTemplateDetailManager({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tplRes, catRes] = await Promise.all([
        fetch(`/api/measurement-templates/${templateId}`),
        fetch("/api/categories"),
      ]);
      const data = (await tplRes.json()) as TemplateDetail & { message?: string };
      const catData = (await catRes.json()) as Array<{ id: string; name: string }>;
      if (!tplRes.ok) throw new Error(data.message ?? "Không thể tải mẫu");
      setTemplate(data);
      setItems(toItems(data.items));
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/measurement-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) setError(data.message ?? "Không thể lưu");
    else void load();
    setSaving(false);
  }

  async function saveItems(nextItems: TemplateItem[]) {
    await save({
      items: nextItems
        .filter((r) => r.pointOfMeasure.trim())
        .map((r, index) => ({
          pointOfMeasure: r.pointOfMeasure.trim(),
          description: r.description.trim() || null,
          tolerance: r.tolerance.trim() || null,
          sortOrder: index,
          values: parseValues(r.valuesText),
        })),
    });
  }

  async function duplicate() {
    const res = await fetch(`/api/measurement-templates/${templateId}/duplicate`, { method: "POST" });
    const data = (await res.json()) as { id?: string; message?: string };
    if (res.ok && data.id) window.location.href = `/admin/measurement-template/${data.id}`;
    else setError(data.message ?? "Không thể sao chép");
  }

  if (loading) return <AdminLoadingState label="Đang tải mẫu thông số..." />;
  if (!template) return <p className="admin-error">{error ?? "Không tìm thấy mẫu"}</p>;

  return (
    <AdminPageShell>
      <PageHeader
        title={`${template.code} — ${template.name}`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/measurement-template" className="admin-btn">
              Quay lại
            </Link>
            <button type="button" className="admin-btn" onClick={() => void duplicate()}>
              Sao chép mẫu
            </button>
          </div>
        }
      />

      {error && <p className="admin-error">{error}</p>}
      {saving && <p className="admin-muted">Đang lưu...</p>}

      <SectionCard title="Thông tin mẫu">
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Tên</span>
            <input
              className="admin-input"
              defaultValue={template.name}
              onBlur={(e) => e.target.value !== template.name && void save({ name: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Nhóm sản phẩm</span>
            <select
              className="admin-select"
              defaultValue={template.productCategoryId ?? ""}
              onChange={(e) => void save({ productCategoryId: e.target.value || null })}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Base size</span>
            <input
              className="admin-input"
              defaultValue={template.baseSize ?? ""}
              onBlur={(e) => void save({ baseSize: e.target.value || null })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>Ghi chú</span>
            <textarea
              className="admin-textarea"
              rows={3}
              defaultValue={template.notes ?? ""}
              onBlur={(e) => void save({ notes: e.target.value || null })}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Bảng điểm đo">
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-btn--xs"
          style={{ marginBottom: 8 }}
          onClick={() => {
            const next = [
              ...items,
              {
                clientKey: `new-${Date.now()}`,
                pointOfMeasure: "",
                description: "",
                tolerance: "",
                valuesText: "",
                sortOrder: items.length,
              },
            ];
            setItems(next);
          }}
        >
          Thêm điểm đo
        </button>
        {items.length === 0 ? (
          <p className="admin-muted">Chưa có điểm đo trong mẫu.</p>
        ) : (
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>Điểm đo</th>
                <th>Mô tả</th>
                <th>Tolerance</th>
                <th>Giá trị size</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.clientKey}>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.pointOfMeasure}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) => (r.clientKey === row.clientKey ? { ...r, pointOfMeasure: e.target.value } : r)),
                        )
                      }
                      onBlur={() => void saveItems(items)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.description}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) => (r.clientKey === row.clientKey ? { ...r, description: e.target.value } : r)),
                        )
                      }
                      onBlur={() => void saveItems(items)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.tolerance}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) => (r.clientKey === row.clientKey ? { ...r, tolerance: e.target.value } : r)),
                        )
                      }
                      onBlur={() => void saveItems(items)}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input admin-input--sm"
                      value={row.valuesText}
                      placeholder="S:50, M:52"
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r) => (r.clientKey === row.clientKey ? { ...r, valuesText: e.target.value } : r)),
                        )
                      }
                      onBlur={() => void saveItems(items)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--xs admin-btn--danger"
                      onClick={() => {
                        const next = items.filter((r) => r.clientKey !== row.clientKey);
                        setItems(next);
                        void saveItems(next);
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </AdminPageShell>
  );
}
