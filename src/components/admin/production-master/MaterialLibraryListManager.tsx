"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  DataToolbar,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/AdminUi";
import ProductionMasterImportModal from "@/components/admin/production-master/ProductionMasterImportModal";
import {
  formatSupplierCountLabel,
  formatSupplierPriceRange,
  type MaterialLibraryKind,
  type MaterialLibraryListItem,
} from "@/features/production-master/material-library";
import {
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
  PRODUCTION_TRIM_CATEGORIES,
  PRODUCTION_TRIM_CATEGORY_LABELS,
} from "@/features/production-master/production-master-labels";

type StatusFilter = "all" | "active" | "inactive";
type KindFilter = "all" | MaterialLibraryKind;
type PriceFilter = "all" | "has_price" | "no_price";
type SortFilter = "updated" | "name" | "code";

export default function MaterialLibraryListManager() {
  const [items, setItems] = useState<MaterialLibraryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortBy, setSortBy] = useState<SortFilter>("updated");
  const [creating, setCreating] = useState(false);
  const [createKind, setCreateKind] = useState<MaterialLibraryKind>("material");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("MAIN_FABRIC");
  const [importOpen, setImportOpen] = useState(false);
  const [importKind, setImportKind] = useState<MaterialLibraryKind>("material");

  const categories = useMemo(() => {
    if (kindFilter === "trim") {
      return PRODUCTION_TRIM_CATEGORIES.map((value) => ({
        value,
        label: PRODUCTION_TRIM_CATEGORY_LABELS[value],
      }));
    }
    if (kindFilter === "material") {
      return PRODUCTION_MATERIAL_CATEGORIES.map((value) => ({
        value,
        label: PRODUCTION_MATERIAL_CATEGORY_LABELS[value],
      }));
    }
    return [
      ...PRODUCTION_MATERIAL_CATEGORIES.map((value) => ({
        value,
        label: `Vải · ${PRODUCTION_MATERIAL_CATEGORY_LABELS[value]}`,
      })),
      ...PRODUCTION_TRIM_CATEGORIES.map((value) => ({
        value,
        label: `Phụ liệu · ${PRODUCTION_TRIM_CATEGORY_LABELS[value]}`,
      })),
    ];
  }, [kindFilter]);

  const createCategories = useMemo(() => {
    if (createKind === "trim") {
      return PRODUCTION_TRIM_CATEGORIES.map((value) => ({
        value,
        label: PRODUCTION_TRIM_CATEGORY_LABELS[value],
      }));
    }
    return PRODUCTION_MATERIAL_CATEGORIES.map((value) => ({
      value,
      label: PRODUCTION_MATERIAL_CATEGORY_LABELS[value],
    }));
  }, [createKind]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (kindFilter !== "all") params.set("kind", kindFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (priceFilter !== "all") params.set("priceStatus", priceFilter);
      params.set("sort", sortBy);
      const res = await fetch(`/api/material-library?${params.toString()}`);
      const data = (await res.json()) as { items?: MaterialLibraryListItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải thư viện nguyên phụ liệu");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, kindFilter, statusFilter, categoryFilter, priceFilter]);

  function exportUrl() {
    const apiPath = importKind === "material" ? "/api/production-materials" : "/api/production-trims";
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter === "active") params.set("activeOnly", "true");
    if (categoryFilter) params.set("category", categoryFilter);
    return `${apiPath}/export?${params.toString()}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const apiPath = createKind === "material" ? "/api/production-materials" : "/api/production-trims";
    const listPath = createKind === "material" ? "/admin/production-materials" : "/admin/trims";
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        category: newCategory,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo nguyên phụ liệu");
      return;
    }
    setCreating(false);
    setNewName("");
    if (data.id) window.location.href = `${listPath}/${data.id}`;
    else void load();
  }

  const filteredEmpty = Boolean(search.trim() || kindFilter !== "all" || statusFilter !== "all" || categoryFilter || priceFilter !== "all");

  return (
    <AdminPageShell>
      <PageHeader
        title="Thư viện nguyên phụ liệu"
        description="Quản lý vải, bo, nhãn, bao bì và nguyên phụ liệu dùng cho tính giá, Tech Pack, BOM và sản xuất."
        actions={
          <>
            <select
              className="admin-select"
              value={importKind}
              onChange={(e) => setImportKind(e.target.value as MaterialLibraryKind)}
              aria-label="Loại file CSV"
            >
              <option value="material">CSV Vải</option>
              <option value="trim">CSV Phụ liệu</option>
            </select>
            <a
              href={importKind === "material" ? "/api/production-materials/import" : "/api/production-trims/import"}
              className="admin-btn"
            >
              Tải file mẫu
            </a>
            <a href={exportUrl()} className="admin-btn">
              Xuất CSV
            </a>
            <button type="button" className="admin-btn" onClick={() => setImportOpen(true)}>
              Nhập CSV
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => {
                setCreating(true);
                setCreateKind("material");
                setNewCategory("MAIN_FABRIC");
              }}
            >
              + Tạo nguyên phụ liệu
            </button>
          </>
        }
      />

      <p className="admin-field-hint" style={{ marginTop: 0 }}>
        CSV hiện quản lý thông tin master (mã, tên, danh mục…). Giá nhà cung cấp nhập trên trang chi tiết — không nằm trong CSV.
      </p>

      <ProductionMasterImportModal
        importPath={importKind === "material" ? "/api/production-materials/import" : "/api/production-trims/import"}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={() => void load()}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <DataToolbar data-testid="material-library-toolbar">
          <input
            className="admin-input admin-data-toolbar__search"
            placeholder="Tìm theo mã hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="admin-select" value={kindFilter} onChange={(e) => {
            setKindFilter(e.target.value as KindFilter);
            setCategoryFilter("");
          }}>
            <option value="all">Tất cả loại</option>
            <option value="material">Vải</option>
            <option value="trim">Phụ liệu</option>
          </select>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kích hoạt</option>
            <option value="inactive">Đã lưu trữ</option>
          </select>
          <select className="admin-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categories.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select className="admin-select" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}>
            <option value="all">Tất cả giá NCC</option>
            <option value="has_price">Có giá NCC</option>
            <option value="no_price">Chưa có giá NCC</option>
          </select>
          <select className="admin-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortFilter)}>
            <option value="updated">Sắp xếp: cập nhật gần nhất</option>
            <option value="name">Sắp xếp: tên A–Z</option>
            <option value="code">Sắp xếp: mã</option>
          </select>
          <button type="submit" className="admin-btn admin-btn--secondary">
            Tìm kiếm
          </button>
        </DataToolbar>
      </form>

      {creating && (
        <form className="admin-inline-form material-library-create" onSubmit={(e) => void handleCreate(e)}>
          <select
            className="admin-select"
            value={createKind}
            onChange={(e) => {
              const next = e.target.value as MaterialLibraryKind;
              setCreateKind(next);
              setNewCategory(next === "material" ? "MAIN_FABRIC" : "LABEL");
            }}
          >
            <option value="material">Vải</option>
            <option value="trim">Phụ liệu</option>
          </select>
          <input
            className="admin-input"
            placeholder={createKind === "material" ? "Tên nguyên phụ liệu (vd: Cotton 100% 250 GSM)" : "Tên phụ liệu (vd: Nhãn dệt)"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <select className="admin-select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
            {createCategories.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-btn admin-btn--primary">
            Tạo
          </button>
          <button type="button" className="admin-btn" onClick={() => setCreating(false)}>
            Hủy
          </button>
        </form>
      )}

      {loading ? (
        <AdminLoadingState label="Đang tải thư viện nguyên phụ liệu…" />
      ) : error && items.length === 0 ? (
        <EmptyState
          tone="error"
          title="Không tải được thư viện nguyên phụ liệu"
          description={error}
          action={
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={filteredEmpty ? "Không tìm thấy kết quả phù hợp" : "Chưa có nguyên phụ liệu"}
          description={
            filteredEmpty
              ? "Thử đổi từ khóa, loại, trạng thái hoặc bộ lọc giá."
              : "Tạo nguyên phụ liệu đầu tiên để sử dụng trong Costing, Tech Pack, BOM và sản xuất."
          }
          action={
            filteredEmpty ? undefined : (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  setCreating(true);
                  setCreateKind("material");
                  setNewCategory("MAIN_FABRIC");
                }}
              >
                + Tạo nguyên phụ liệu
              </button>
            )
          }
        />
      ) : (
        <>
          {error && <p className="admin-error">{error}</p>}
          <div className="admin-table-wrap material-library-table-wrap">
            <table className="admin-table material-library-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Nguyên phụ liệu</th>
                  <th>Loại</th>
                  <th>Quy cách</th>
                  <th>NCC</th>
                  <th className="material-library-price-col">Giá tham khảo</th>
                  <th>Đơn vị</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td>
                      <Link href={row.detailPath}>
                        <code>{row.code}</code>
                      </Link>
                    </td>
                    <td>
                      <Link href={row.detailPath} className="material-library-name">
                        {row.name}
                      </Link>
                      <div className="admin-field-hint">{row.categoryLabel}</div>
                    </td>
                    <td>
                      <StatusBadge tone={row.kind === "material" ? "info" : "neutral"}>{row.typeLabel}</StatusBadge>
                    </td>
                    <td>{row.specLabel}</td>
                    <td>
                      <div>{formatSupplierCountLabel(row.priceSummary.activeCount)}</div>
                      {row.defaultSupplierName && row.priceSummary.activeCount === 0 && (
                        <div className="admin-field-hint">{row.defaultSupplierName}</div>
                      )}
                    </td>
                    <td className="material-library-price-col">{formatSupplierPriceRange(row.priceSummary)}</td>
                    <td>{row.priceSummary.unit ?? "—"}</td>
                    <td>
                      <StatusBadge tone={row.isActive ? "success" : "danger"}>
                        {row.isActive ? "Đang dùng" : "Đã lưu trữ"}
                      </StatusBadge>
                    </td>
                    <td>
                      {new Date(row.updatedAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="material-library-cards" aria-label="Danh sách dạng thẻ">
            {items.map((row) => (
              <article key={`card-${row.kind}-${row.id}`} className="material-library-card">
                <div className="material-library-card__head">
                  <Link href={row.detailPath} className="material-library-name">
                    {row.name}
                  </Link>
                  <StatusBadge tone={row.kind === "material" ? "info" : "neutral"}>{row.typeLabel}</StatusBadge>
                </div>
                <div className="admin-field-hint">
                  <code>{row.code}</code> · {row.categoryLabel}
                </div>
                <div className="material-library-card__meta">
                  <span>{formatSupplierCountLabel(row.priceSummary.activeCount)}</span>
                  <span className="material-library-price-col">{formatSupplierPriceRange(row.priceSummary)}</span>
                </div>
                <div className="material-library-card__meta">
                  <span>{row.specLabel}</span>
                  <StatusBadge tone={row.isActive ? "success" : "danger"}>
                    {row.isActive ? "Đang dùng" : "Đã lưu trữ"}
                  </StatusBadge>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
