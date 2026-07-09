"use client";

import { useEffect, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";

type TemplateOption = {
  id: string;
  code: string;
  name: string;
  baseSize: string | null;
  productCategory?: { name: string } | null;
};

type Props = {
  label?: string;
  disabled?: boolean;
  applyUrl: string;
  onApplied?: () => void;
};

export default function MeasurementTemplateApplyButton({
  label = "Áp dụng mẫu thông số",
  disabled,
  applyUrl,
  onApplied,
}: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    void fetch(`/api/measurement-templates?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { items?: TemplateOption[] }) => setTemplates(data.items ?? []))
      .finally(() => setLoading(false));
  }, [open, search]);

  async function apply(templateId: string) {
    setApplying(true);
    setError(null);
    const res = await fetch(applyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể áp dụng mẫu");
    } else {
      setOpen(false);
      onApplied?.();
    }
    setApplying(false);
  }

  return (
    <>
      <button type="button" className="admin-btn" disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="admin-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn mẫu thông số</h3>
            <input
              className="admin-input"
              placeholder="Tìm theo mã hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {error && <p className="admin-error">{error}</p>}
            {loading && <AdminInlineLoader message="Đang tải mẫu thông số…" />}
            <ul className="admin-picker-list">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="admin-picker-list__item"
                    disabled={applying}
                    onClick={() => void apply(t.id)}
                  >
                    <strong>{t.code}</strong> — {t.name}
                    {t.baseSize && <span className="admin-muted"> · Base: {t.baseSize}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {templates.length === 0 && !loading && <p className="admin-muted">Không tìm thấy mẫu.</p>}
            <button type="button" className="admin-btn" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
