"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import ProductionMasterImportModal from "@/components/admin/production-master/ProductionMasterImportModal";
import type { MasterAdminConfig } from "@/components/admin/production-master/production-master-admin-config";
import {
  PRINT_METHOD_CATEGORIES,
  PRINT_METHOD_CATEGORY_LABELS,
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
  PRODUCTION_TRIM_CATEGORIES,
  PRODUCTION_TRIM_CATEGORY_LABELS,
  SUPPLIER_CATEGORIES,
  SUPPLIER_CATEGORY_LABELS,
} from "@/features/production-master/production-master-labels";

type Props = {
  config: MasterAdminConfig;
};

type StatusFilter = "all" | "active" | "inactive";
type SortFilter = "updated" | "usage";

function categoryOptions(config: MasterAdminConfig) {
  if (config.kind === "material") {
    return PRODUCTION_MATERIAL_CATEGORIES.map((v) => ({
      value: v,
      label: PRODUCTION_MATERIAL_CATEGORY_LABELS[v],
    }));
  }
  if (config.kind === "trim") {
    return PRODUCTION_TRIM_CATEGORIES.map((v) => ({
      value: v,
      label: PRODUCTION_TRIM_CATEGORY_LABELS[v],
    }));
  }
  if (config.kind === "print-method") {
    return PRINT_METHOD_CATEGORIES.map((v) => ({
      value: v,
      label: PRINT_METHOD_CATEGORY_LABELS[v],
    }));
  }
  if (config.kind === "supplier") {
    return SUPPLIER_CATEGORIES.map((value) => ({
      value,
      label: SUPPLIER_CATEGORY_LABELS[value] ?? value,
    }));
  }
  return [];
}

export default function ProductionMasterListManager({ config }: Props) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortFilter>("updated");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("GENERAL");
  const [importOpen, setImportOpen] = useState(false);

  const categories = useMemo(() => categoryOptions(config), [config]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter === "active") params.set("activeOnly", "true");
      if (statusFilter === "inactive") params.set("inactiveOnly", "true");
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`${config.apiPath}?${params.toString()}`);
      const data = (await res.json()) as { items?: Array<Record<string, unknown>>; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      let next = data.items ?? [];
      if (sortBy === "usage") {
        next = [...next].sort((a, b) => Number(b.usageCount ?? 0) - Number(a.usageCount ?? 0));
      }
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [sortBy]);

  function exportUrl() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter === "active") params.set("activeOnly", "true");
    if (categoryFilter) params.set("category", categoryFilter);
    return `${config.apiPath}/export?${params.toString()}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const body: Record<string, unknown> = { name: newName.trim() };
    if (config.kind === "supplier") {
      body.category = categoryFilter || newCategory || "GENERAL";
    }
    const res = await fetch(config.apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo mới");
      return;
    }
    setCreating(false);
    setNewName("");
    if (data.id) window.location.href = `${config.listPath}/${data.id}`;
    else void load();
  }

  return (
    <AdminPageShell>
      <PageHeader
        title={config.title}
        actions={
          <>
            <a href={`${config.apiPath}/import`} className="admin-btn">
              Tải file mẫu
            </a>
            <a href={exportUrl()} className="admin-btn">
              Xuất CSV
            </a>
            <button type="button" className="admin-btn" onClick={() => setImportOpen(true)}>
              Nhập CSV
            </button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
              Tạo mới
            </button>
          </>
        }
      />

      <ProductionMasterImportModal
        importPath={`${config.apiPath}/import`}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={() => void load()}
      />

      {error && <p className="admin-error">{error}</p>}

      <form
        className="admin-filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="admin-input"
          placeholder="Tìm theo mã hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang kích hoạt</option>
          <option value="inactive">Đã lưu trữ</option>
        </select>
        {categories.length > 0 && (
          <select
            className="admin-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        <select className="admin-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortFilter)}>
          <option value="updated">Sắp xếp: cập nhật gần nhất</option>
          <option value="usage">Sắp xếp: mức sử dụng</option>
        </select>
        <button type="submit" className="admin-btn">
          Tìm kiếm
        </button>
      </form>

      {creating && (
        <form className="admin-inline-form" onSubmit={(e) => void handleCreate(e)}>
          <input
            className="admin-input"
            placeholder={config.createLabel}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          {config.kind === "supplier" && (
            <select
              className="admin-select"
              value={categoryFilter || newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {categories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="admin-btn admin-btn--primary">
            Tạo
          </button>
          <button type="button" className="admin-btn" onClick={() => setCreating(false)}>
            Hủy
          </button>
        </form>
      )}

      {loading ? (
        <AdminLoadingState label={`Đang tải ${config.title.toLowerCase()}...`} />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có dữ liệu" description="Tạo mục đầu tiên để bắt đầu." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const id = String(row.id ?? "");
                return (
                  <tr key={id}>
                    {config.columns.map((col, index) => {
                      const cell =
                        col.render?.(row) ??
                        (row[col.key] != null ? String(row[col.key]) : "—");
                      if (index === 0) {
                        return (
                          <td key={col.key}>
                            <Link href={`${config.listPath}/${id}`}>{cell}</Link>
                          </td>
                        );
                      }
                      return <td key={col.key}>{cell}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
