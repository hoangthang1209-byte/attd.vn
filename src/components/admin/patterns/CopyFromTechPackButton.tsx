"use client";

import { useEffect, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";

type TechPackOption = {
  id: string;
  code: string;
  version: number;
  productNameSnapshot: string | null;
};

type Props = {
  patternId: string;
  onCopied?: () => void;
};

export default function CopyFromTechPackButton({ patternId, onCopied }: Props) {
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<TechPackOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    void fetch(`/api/tech-packs?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { items?: TechPackOption[] }) => setPacks(data.items ?? []))
      .finally(() => setLoading(false));
  }, [open, search]);

  async function copy(techPackId: string) {
    setCopying(true);
    setError(null);
    const res = await fetch(`/api/patterns/${patternId}/copy-from-tech-pack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ techPackId }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) setError(data.message ?? "Không thể sao chép");
    else {
      setOpen(false);
      onCopied?.();
    }
    setCopying(false);
  }

  return (
    <>
      <button type="button" className="admin-btn" onClick={() => setOpen(true)}>
        Sao chép từ Tech Pack
      </button>
      {open && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="admin-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn Tech Pack</h3>
            <input
              className="admin-input"
              placeholder="Tìm theo mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {error && <p className="admin-error">{error}</p>}
            {loading && <AdminInlineLoader message="Đang tải Tech Pack…" />}
            <ul className="admin-picker-list">
              {packs.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="admin-picker-list__item"
                    disabled={copying}
                    onClick={() => void copy(p.id)}
                  >
                    <strong>{p.code}</strong> v{p.version}
                    {p.productNameSnapshot && <span className="admin-muted"> — {p.productNameSnapshot}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {packs.length === 0 && !loading && <p className="admin-muted">Không tìm thấy Tech Pack.</p>}
            <button type="button" className="admin-btn" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
