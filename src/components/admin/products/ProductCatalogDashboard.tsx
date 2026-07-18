"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductExportDialog from "@/components/admin/products/ProductExportDialog";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  evaluateProductReadiness,
  PRODUCT_READINESS_BADGE_LABELS,
  PRODUCT_READINESS_FILTER_OPTIONS,
  productMatchesReadinessFilter,
  summarizeProductReadiness,
  type ProductReadinessBadge,
  type ProductReadinessFilter,
} from "@/features/products/product-admin-readiness";

type ProductVariantRow = {
  id: string;
  sku: string;
  stockQty: number;
  stockStatus: string;
  variantStatus: string;
  colorName: string | null;
  sizeName: string | null;
  wholesalePrice: number | null;
  dealerPrice: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
  status: string;
  defaultMoq: number | null;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  updatedAt: string;
  category: { id: string; name: string; slug: string; skuCode: string | null };
  variants: ProductVariantRow[];
  images: { imageUrl: string }[];
  featuredImage?: string | null;
  gallery?: string[];
  leadTime?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type KpiData = {
  totalProducts: number;
  activeProducts: number;
  totalVariants: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  preorderVariants: number;
};

type FetchResult = {
  products: ProductRow[];
  total: number;
  page: number;
  kpis: KpiData;
};

const STOCK_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  IN_STOCK: { label: "Còn hàng", cls: "admin-kb-badge--verified" },
  LOW_STOCK: { label: "Sắp hết", cls: "admin-kb-badge--medium" },
  OUT_OF_STOCK: { label: "Hết hàng", cls: "admin-kb-badge--low" },
  PREORDER: { label: "Đặt trước", cls: "admin-kb-badge--ai" },
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Đang bán", cls: "admin-kb-badge--verified" },
  DRAFT: { label: "Nháp", cls: "admin-kb-badge--medium" },
  INACTIVE: { label: "Tạm dừng", cls: "admin-kb-badge--low" },
  ARCHIVED: { label: "Lưu trữ", cls: "admin-kb-badge--low" },
};

const READINESS_BADGE_CLASS: Record<ProductReadinessBadge, string> = {
  ready: "admin-product-readiness-badge admin-product-readiness-badge--ready",
  missing_image: "admin-product-readiness-badge admin-product-readiness-badge--warn",
  missing_price: "admin-product-readiness-badge admin-product-readiness-badge--warn",
  missing_variants: "admin-product-readiness-badge admin-product-readiness-badge--warn",
  missing_stock: "admin-product-readiness-badge admin-product-readiness-badge--warn",
  unpublished: "admin-product-readiness-badge admin-product-readiness-badge--muted",
  missing_seo: "admin-product-readiness-badge admin-product-readiness-badge--warn",
};

export default function ProductCatalogDashboard() {
  const router = useRouter();
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<ProductReadinessFilter>("all");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (status) params.set("status", status);
    if (stockStatus) params.set("stockStatus", stockStatus);
    try {
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = (await res.json()) as FetchResult;
      setData(json);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [search, categoryId, status, stockStatus]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    void fetch("/api/admin/products/categories")
      .then((r) => r.json())
      .then((cats: { id: string; name: string }[]) => setCategories(cats));
  }, []);

  const productsWithReadiness = useMemo(() => {
    return (data?.products ?? []).map((product) => ({
      product,
      readiness: evaluateProductReadiness(product),
    }));
  }, [data?.products]);

  const readinessSummary = useMemo(
    () => summarizeProductReadiness(productsWithReadiness.map((row) => row.readiness)),
    [productsWithReadiness],
  );

  const visibleProducts = useMemo(
    () =>
      productsWithReadiness.filter((row) =>
        productMatchesReadinessFilter(row.readiness, readinessFilter),
      ),
    [productsWithReadiness, readinessFilter],
  );

  async function seedSampleData() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/admin/products/starter", { method: "POST" });
      const json = (await res.json()) as { message?: string };
      setSeedMsg(json.message ?? "Đã import dữ liệu mẫu.");
      void fetchProducts();
    } catch {
      setSeedMsg("Lỗi import dữ liệu mẫu.");
    }
    setSeeding(false);
  }

  async function archiveProduct(id: string) {
    const confirmed = confirm(
      "Lưu trữ sản phẩm?\n\nSản phẩm sẽ bị ẩn khỏi website nhưng dữ liệu lịch sử vẫn được giữ lại.",
    );
    if (!confirmed) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Không thể lưu trữ sản phẩm.");
      return;
    }
    alert("Đã lưu trữ sản phẩm");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    void fetchProducts();
  }

  async function restoreProduct(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", status: "DRAFT" }),
    });
    if (!res.ok) {
      alert("Không thể khôi phục sản phẩm.");
      return;
    }
    alert("Đã khôi phục sản phẩm ở trạng thái nháp.");
    void fetchProducts();
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAllVisible(checked: boolean) {
    const ids = visibleProducts.map((row) => row.product.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const activeFilters = {
    search: search || undefined,
    categoryId: categoryId || undefined,
    status: status || undefined,
    stockStatus: stockStatus || undefined,
  };

  const allVisibleSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((row) => selectedIds.has(row.product.id));

  const kpis = data?.kpis;

  return (
    <div className="admin-catalog-page" data-testid="admin-products-dashboard">
      {kpis && (
        <div className="admin-catalog-kpi-bar">
          <div className="admin-catalog-kpi">
            <strong>{kpis.totalProducts}</strong>
            <span>Tổng sản phẩm</span>
          </div>
          <div className="admin-catalog-kpi">
            <strong>{kpis.activeProducts}</strong>
            <span>Đang bán</span>
          </div>
          <div className="admin-catalog-kpi">
            <strong>{kpis.totalVariants}</strong>
            <span>Tổng SKU</span>
          </div>
          <div className="admin-catalog-kpi admin-catalog-kpi--warn">
            <strong>{kpis.lowStockVariants}</strong>
            <span>Sắp hết hàng</span>
          </div>
          <div className="admin-catalog-kpi admin-catalog-kpi--danger">
            <strong>{kpis.outOfStockVariants}</strong>
            <span>Hết hàng</span>
          </div>
          <div className="admin-catalog-kpi">
            <strong>{kpis.preorderVariants}</strong>
            <span>Đặt trước</span>
          </div>
        </div>
      )}

      <div className="admin-product-readiness-summary" data-testid="product-readiness-summary">
        <div className="admin-catalog-kpi">
          <strong>{data?.total ?? readinessSummary.total}</strong>
          <span>Tổng sản phẩm</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{readinessSummary.ready}</strong>
          <span>Sẵn sàng</span>
        </div>
        <div className="admin-catalog-kpi admin-catalog-kpi--warn">
          <strong>{readinessSummary.needsAttention}</strong>
          <span>Cần bổ sung</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{readinessSummary.unpublished}</strong>
          <span>Chưa publish</span>
        </div>
        <p className="admin-field-hint admin-product-readiness-summary__hint">
          Chỉ số sẵn sàng tính trên trang kết quả hiện tại.
        </p>
      </div>

      <div className="admin-catalog-toolbar">
        <div className="admin-catalog-toolbar-left">
          <Link href="/admin/products/new" className="admin-btn admin-btn--primary">
            Tạo sản phẩm mới
          </Link>
          <Link href="/admin/products/import" className="admin-btn admin-btn--secondary">
            Nhập sản phẩm
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setExportOpen(true)}
          >
            Xuất dữ liệu
          </button>
          <AdminLoadingButton
            variant="secondary"
            pending={seeding}
            pendingLabel="Đang tạo dữ liệu mẫu..."
            onClick={() => void seedSampleData()}
          >
            Tạo dữ liệu mẫu
          </AdminLoadingButton>
        </div>
        <div className="admin-catalog-toolbar-right">
          {selectedIds.size > 0 && (
            <span className="admin-field-hint">Đã chọn {selectedIds.size} sản phẩm</span>
          )}
          <span className="admin-field-hint">{data?.total ?? 0} sản phẩm</span>
        </div>
      </div>

      <ProductExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultScope={selectedIds.size > 0 ? "selected" : "filtered"}
        productIds={[...selectedIds]}
        filters={activeFilters}
        selectedCount={selectedIds.size}
      />

      {seedMsg && (
        <p className="admin-kb-warning admin-kb-badge--verified" style={{ marginBottom: 12 }}>
          {seedMsg}
        </p>
      )}

      <div className="admin-catalog-filters">
        <input
          className="admin-input"
          placeholder="Tìm tên sản phẩm, mã hàng, SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void fetchProducts();
          }}
        />
        <select
          className="admin-input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="DRAFT">Nháp</option>
          <option value="INACTIVE">Tạm dừng</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
        <select
          className="admin-input"
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value)}
        >
          <option value="">Tất cả tồn kho</option>
          <option value="IN_STOCK">Còn hàng</option>
          <option value="LOW_STOCK">Sắp hết</option>
          <option value="OUT_OF_STOCK">Hết hàng</option>
          <option value="PREORDER">Đặt trước</option>
        </select>
        <select
          className="admin-input"
          value={readinessFilter}
          onChange={(e) => setReadinessFilter(e.target.value as ProductReadinessFilter)}
          aria-label="Lọc mức sẵn sàng"
          data-testid="product-readiness-filter"
        >
          {PRODUCT_READINESS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => void fetchProducts()}
        >
          Lọc
        </button>
      </div>

      {loading ? (
        <TableLoading
          title="Đang tải danh sách sản phẩm..."
          description="Hệ thống đang cập nhật dữ liệu catalog mới nhất."
          tone="admin"
        />
      ) : (
        <div className="admin-catalog-table-wrap">
          <table className="admin-catalog-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                    aria-label="Chọn tất cả sản phẩm đang hiển thị"
                  />
                </th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th>Mã hàng</th>
                <th>Trạng thái</th>
                <th>Sẵn sàng</th>
                <th>SKU</th>
                <th>Tồn kho</th>
                <th>MOQ</th>
                <th>Lead-time</th>
                <th>Tính năng</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map(({ product: p, readiness }) => {
                const statusInfo = STATUS_LABELS[p.status] ?? { label: p.status, cls: "" };
                const lowCount = p.variants.filter((v) => v.stockStatus === "LOW_STOCK").length;
                const outCount = p.variants.filter((v) => v.stockStatus === "OUT_OF_STOCK").length;
                const stockSummary =
                  outCount > 0
                    ? STOCK_STATUS_LABELS.OUT_OF_STOCK
                    : lowCount > 0
                      ? STOCK_STATUS_LABELS.LOW_STOCK
                      : STOCK_STATUS_LABELS.IN_STOCK;

                return (
                  <tr key={p.id} data-testid={`product-row-${p.id}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => toggleSelect(p.id, e.target.checked)}
                        aria-label={`Chọn sản phẩm ${p.name}`}
                      />
                    </td>
                    <td>
                      <div className="admin-catalog-product-name">
                        {(p.featuredImage ?? p.images[0]?.imageUrl ?? (p.gallery ?? [])[0]) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              p.featuredImage ?? p.images[0]?.imageUrl ?? (p.gallery ?? [])[0]
                            }
                            alt={p.name}
                            className="admin-catalog-thumb"
                          />
                        )}
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-field-hint">{p.category.name}</span>
                      {p.category.skuCode && (
                        <span className="admin-kb-tag">{p.category.skuCode}</span>
                      )}
                    </td>
                    <td>
                      <code className="admin-catalog-code">{p.productCode ?? "—"}</code>
                    </td>
                    <td>
                      <span className={`admin-kb-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                    </td>
                    <td>
                      <div
                        className="admin-product-readiness-badges"
                        data-testid={`product-readiness-${p.id}`}
                      >
                        {readiness.badges.map((badge) => (
                          <span key={badge} className={READINESS_BADGE_CLASS[badge]}>
                            {PRODUCT_READINESS_BADGE_LABELS[badge]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="admin-field-hint">{p.variants.length} SKU</span>
                    </td>
                    <td>
                      {p.variants.length > 0 ? (
                        <span className={`admin-kb-badge ${stockSummary.cls}`}>
                          {stockSummary.label}
                        </span>
                      ) : (
                        <span className="admin-field-hint">—</span>
                      )}
                    </td>
                    <td>
                      <span className="admin-field-hint">
                        {p.defaultMoq ? `${p.defaultMoq} cái` : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="admin-field-hint" style={{ whiteSpace: "nowrap" }}>
                        {p.leadTime ?? "—"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-catalog-badges">
                        {p.supportsPrinting && <span className="admin-kb-tag">In</span>}
                        {p.supportsEmbroidery && <span className="admin-kb-tag">Thêu</span>}
                        {p.supportsOem && <span className="admin-kb-tag">OEM</span>}
                      </div>
                    </td>
                    <td>
                      <span className="admin-field-hint">
                        {new Date(p.updatedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td>
                      <div className="admin-catalog-actions-cell">
                        {!readiness.isReady && (
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="admin-btn admin-btn--primary admin-btn--xs"
                            data-testid={`product-complete-${p.id}`}
                          >
                            Hoàn thiện
                          </Link>
                        )}
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => router.push(`/admin/products/${p.id}/edit`)}
                        >
                          Sửa
                        </button>
                        {p.slug ? (
                          <a
                            href={`/san-pham/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                          >
                            Xem
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            disabled
                            title="Sản phẩm chưa có slug"
                          >
                            Xem
                          </button>
                        )}
                        {p.status === "ARCHIVED" ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            onClick={() => void restoreProduct(p.id)}
                          >
                            Khôi phục
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            onClick={() => void archiveProduct(p.id)}
                          >
                            Lưu trữ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleProducts.length === 0 && (
            <p className="admin-field-hint" style={{ padding: "24px 0", textAlign: "center" }}>
              Không tìm thấy sản phẩm. Thử tạo dữ liệu mẫu hoặc thêm sản phẩm mới.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
