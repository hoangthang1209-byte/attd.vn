"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  PageHeader,
  SectionCard,
} from "@/components/admin/AdminUi";
import ProductionMasterSearchSelect from "@/components/admin/production-master/ProductionMasterSearchSelect";
import type { MasterAdminConfig } from "@/components/admin/production-master/production-master-admin-config";

type Props = {
  config: MasterAdminConfig;
  itemId: string;
};

export default function ProductionMasterDetailManager({ config, itemId }: Props) {
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeTargetLabel, setMergeTargetLabel] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const itemRes = await fetch(`${config.apiPath}/${itemId}`);
      const data = (await itemRes.json()) as Record<string, unknown> & { message?: string };
      if (!itemRes.ok) throw new Error(data.message ?? "Không thể tải chi tiết");
      setItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [config.apiPath, itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`${config.apiPath}/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) setError(data.message ?? "Không thể lưu");
    else void load();
    setSaving(false);
  }

  async function handleArchive() {
    if (!window.confirm("Lưu trữ mục này? Nếu đang được dùng trong Tech Pack, hệ thống sẽ chỉ ngừng kích hoạt.")) {
      return;
    }
    const res = await fetch(`${config.apiPath}/${itemId}`, { method: "DELETE" });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể lưu trữ");
      return;
    }
    alert(data.message ?? "Đã lưu trữ.");
    void load();
  }

  async function handleMerge() {
    if (!mergeTargetId) return;
    if (
      !window.confirm(
        "Toàn bộ BOM đang dùng nhà cung cấp này sẽ được chuyển sang nhà cung cấp được chọn.",
      )
    ) {
      return;
    }
    setMerging(true);
    setError(null);
    const res = await fetch(`${config.apiPath}/${itemId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetSupplierId: mergeTargetId }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể gộp nhà cung cấp");
    } else {
      setMergeOpen(false);
      window.location.href = config.listPath;
    }
    setMerging(false);
  }

  if (loading) return <AdminLoadingState label="Đang tải..." />;
  if (!item) return <p className="admin-error">{error ?? "Không tìm thấy"}</p>;

  const code = String(item.code ?? "");
  const name = String(item.name ?? "");
  const usageCount = Number(item.usageCount ?? 0);
  const usageBreakdown = (item.usageBreakdown as Record<string, number> | undefined) ?? {};
  const isActive = fieldBool("isActive");
  const isReferenced = usageCount > 0;
  const statusBadge = !isActive ? "Đã lưu trữ" : isReferenced ? "Đang dùng" : "Chưa dùng";
  const createdAt = item.createdAt ? new Date(String(item.createdAt)).toLocaleString("vi-VN") : "—";
  const updatedAt = item.updatedAt ? new Date(String(item.updatedAt)).toLocaleString("vi-VN") : "—";

  function fieldValue(key: string): string {
    const v = item?.[key];
    if (v == null) return "";
    return String(v);
  }

  function fieldBool(key: string): boolean {
    return Boolean(item?.[key]);
  }

  return (
    <AdminPageShell>
      <PageHeader
        title={`${code} — ${name}`}
        actions={
          <>
            {config.kind === "supplier" && (
              <button type="button" className="admin-btn" onClick={() => setMergeOpen(true)}>
                Gộp nhà cung cấp
              </button>
            )}
            <button type="button" className="admin-btn admin-btn--danger" onClick={() => void handleArchive()}>
              Lưu trữ
            </button>
            <Link href={config.listPath} className="admin-btn">
              Quay lại
            </Link>
          </>
        }
      />

      {error && <p className="admin-error">{error}</p>}
      {saving && <p className="admin-muted">Đang lưu...</p>}

      <SectionCard title="Thông tin hệ thống">
        <div className="admin-meta-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div>
            <strong>Tạo lúc</strong>
            <div>{createdAt}</div>
          </div>
          <div>
            <strong>Cập nhật</strong>
            <div>{updatedAt}</div>
          </div>
          <div>
            <strong>Trạng thái</strong>
            <div>{statusBadge}</div>
          </div>
          <div>
            <strong>Tổng sử dụng</strong>
            <div>{usageCount > 0 ? usageCount : "—"}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Mức sử dụng">
        <dl className="admin-dl">
          {(config.kind === "material" || config.kind === "trim" || config.kind === "supplier") && (
            <div>
              <dt>Tech Pack BOM</dt>
              <dd>{usageBreakdown.techPackBom ?? usageCount ?? 0}</dd>
            </div>
          )}
          {config.kind === "print-method" && (
            <div>
              <dt>Vị trí artwork</dt>
              <dd>{usageBreakdown.artworkPlacements ?? usageCount ?? 0}</dd>
            </div>
          )}
          {config.kind === "supplier" && (
            <>
              <div>
                <dt>Nguyên liệu liên kết</dt>
                <dd>{usageBreakdown.materialCount ?? 0}</dd>
              </div>
              <div>
                <dt>Phụ liệu liên kết</dt>
                <dd>{usageBreakdown.trimCount ?? 0}</dd>
              </div>
            </>
          )}
        </dl>
        {isReferenced && (
          <p className="admin-muted" style={{ marginTop: 8, fontSize: 13 }}>
            Mục này đang được tham chiếu. Chỉ có thể lưu trữ, không thể xóa cứng.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Thông tin">
        <div className="admin-form-grid">
          {config.fields.map((field) => {
            if (field.type === "checkbox") {
              return (
                <label key={field.key} className="admin-field admin-field--checkbox">
                  <input
                    type="checkbox"
                    checked={fieldBool(field.key)}
                    onChange={(e) => void save({ [field.key]: e.target.checked })}
                  />
                  <span>{field.label}</span>
                </label>
              );
            }

            if (field.type === "supplier-select") {
              const supplier = item.supplier as { id?: string; code?: string; name?: string } | null;
              const label = supplier ? `${supplier.code} — ${supplier.name}` : null;
              return (
                <label key={field.key} className={`admin-field${field.fullWidth ? " admin-field--full" : ""}`}>
                  <span>{field.label}</span>
                  <ProductionMasterSearchSelect
                    apiPath="/api/production-suppliers"
                    value={fieldValue("supplierId") || null}
                    displayLabel={label}
                    placeholder="Chọn NCC sản xuất..."
                    onSelect={(picked) =>
                      void save({ supplierId: picked?.id ?? null })
                    }
                  />
                </label>
              );
            }

            if (field.type === "select") {
              return (
                <label key={field.key} className="admin-field">
                  <span>{field.label}</span>
                  <select
                    className="admin-select"
                    value={fieldValue(field.key)}
                    onChange={(e) => void save({ [field.key]: e.target.value })}
                  >
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            if (field.type === "textarea") {
              return (
                <label
                  key={field.key}
                  className={`admin-field${field.fullWidth ? " admin-field--full" : ""}`}
                >
                  <span>{field.label}</span>
                  <textarea
                    className="admin-textarea"
                    rows={3}
                    defaultValue={fieldValue(field.key)}
                    onBlur={(e) => {
                      const next = e.target.value || null;
                      if (next !== (item[field.key] as string | null)) {
                        void save({ [field.key]: next });
                      }
                    }}
                  />
                </label>
              );
            }

            return (
              <label key={field.key} className="admin-field">
                <span>{field.label}</span>
                <input
                  className="admin-input"
                  defaultValue={fieldValue(field.key)}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (field.key === "name") {
                      if (next && next !== fieldValue(field.key)) void save({ [field.key]: next });
                      return;
                    }
                    if (next !== fieldValue(field.key)) {
                      void save({ [field.key]: next || null });
                    }
                  }}
                />
              </label>
            );
          })}
        </div>
      </SectionCard>

      {mergeOpen && config.kind === "supplier" && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setMergeOpen(false)}>
          <div className="admin-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Gộp nhà cung cấp</h3>
            <p className="admin-muted">
              Toàn bộ BOM đang dùng nhà cung cấp này sẽ được chuyển sang nhà cung cấp được chọn.
            </p>
            <label className="admin-field admin-field--full">
              <span>Nhà cung cấp đích</span>
              <ProductionMasterSearchSelect
                apiPath="/api/production-suppliers"
                value={mergeTargetId}
                displayLabel={mergeTargetLabel}
                placeholder="Tìm nhà cung cấp..."
                onSelect={(picked) => {
                  setMergeTargetId(picked?.id ?? null);
                  setMergeTargetLabel(picked ? `${picked.code} — ${picked.name}` : null);
                }}
              />
            </label>
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setMergeOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={!mergeTargetId || merging}
                onClick={() => void handleMerge()}
              >
                {merging ? "Đang gộp..." : "Xác nhận gộp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
