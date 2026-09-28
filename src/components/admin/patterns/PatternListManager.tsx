"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  FileUp,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
} from "@/components/admin/AdminUi";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import { PatternStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import type { PatternSourceType, PatternStatus } from "@prisma/client";
import { patternAdminDetailPath } from "@/features/patterns/pattern-admin-routes";
import { formatPatternSourceLabel } from "@/features/patterns/pattern-source-labels";
import PatternCategoryThumbnail from "@/components/admin/patterns/PatternCategoryThumbnail";
import { normalizePatternCategoryVisual } from "@/features/patterns/pattern-category-visual";
import { formatPatternSupplierListLabel } from "@/features/patterns/pattern-supplier-display";
import PatternBulkImportDialog from "@/components/admin/patterns/PatternBulkImportDialog";
import styles from "./PatternLibrary.module.css";

type PatternCategoryVisual = {
  id: string;
  name: string;
  imageUrl?: string | null;
  products?: Array<{ featuredImage: string | null }>;
};

type PatternRow = {
  id: string;
  code: string;
  name: string;
  version: number;
  baseSize: string | null;
  sizeRange: string | null;
  status: PatternStatus;
  sourceType: PatternSourceType | null;
  sourceSupplier: string | null;
  sourceSupplierCode: string | null;
  customerNameSnapshot: string | null;
  patternSupplier?: { code: string; name: string } | null;
  updatedAt: string;
  productCategory?: PatternCategoryVisual | null;
  product?: { id: string; name: string; productCode: string | null } | null;
  customer?: { name: string; code: string } | null;
  _count?: { files: number; techPacks: number };
};

type PatternStats = {
  all: number;
  draft: number;
  approved: number;
  archived: number;
};

type PatternListResponse = {
  items?: PatternRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  pageCount?: number;
  stats?: PatternStats;
  message?: string;
};

type PatternDeleteResponse = {
  message?: string;
  error?: string;
  traceId?: string;
  storageWarnings?: string[];
};

const EMPTY_STATS: PatternStats = { all: 0, draft: 0, approved: 0, archived: 0 };

function formatPatternListDate(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPatternDeleteError(data: PatternDeleteResponse): string {
  const message = data.message ?? data.error ?? "Không thể xóa rập.";
  if (data.traceId) return `${message} Mã tra cứu: ${data.traceId}`;
  return message;
}

function technicalSummary(row: PatternRow): string {
  const parts = [];
  if (row.baseSize) parts.push(`Base ${row.baseSize}`);
  if (row.sizeRange) parts.push(row.sizeRange);
  return parts.join(" · ") || "Chưa có size";
}

export default function PatternListManager() {
  const [items, setItems] = useState<PatternRow[]>([]);
  const [stats, setStats] = useState<PatternStats>(EMPTY_STATS);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const { permissions } = useAdminPermissions();
  const canDeletePattern = permissions.canUpdateProduction;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());

      const res = await fetch(`/api/patterns?${params.toString()}`);
      const data = (await res.json()) as PatternListResponse;
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách rập");

      setItems(data.items ?? []);
      setStats(data.stats ?? EMPTY_STATS);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);

      if ((data.pageCount ?? 1) < page) {
        setPage(Math.max(1, data.pageCount ?? 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch() {
    setPage(1);
    setAppliedSearch(search.trim());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo rập");
      return;
    }
    setCreating(false);
    setNewName("");
    if (data.id) window.location.href = patternAdminDetailPath(data.id);
    else void load();
  }

  async function handleArchive(row: PatternRow) {
    if (archivingId || row.status === "ARCHIVED") return;
    if (!window.confirm(`Lưu trữ ${row.code} — ${row.name}?`)) return;

    setArchivingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/patterns/${row.id}/archive`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu trữ rập.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu trữ rập.");
    } finally {
      setArchivingId(null);
    }
  }

  async function handleDelete(row: PatternRow) {
    if (!canDeletePattern || deletingId) return;
    const confirmed = window.confirm(
      `Xóa vĩnh viễn ${row.code} — ${row.name}? Chỉ nên dùng cho dữ liệu nhập nhầm hoặc bản nháp chưa sử dụng.`,
    );
    if (!confirmed) return;

    setDeletingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/patterns/${row.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as PatternDeleteResponse;
      if (!res.ok) throw new Error(formatPatternDeleteError(data));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa rập.");
    } finally {
      setDeletingId(null);
    }
  }

  const firstItem = total === 0 ? 0 : (page - 1) * 25 + 1;
  const lastItem = Math.min(page * 25, total);

  return (
    <AdminPageShell>
      <div className={styles.library}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>Thư viện rập</h1>
            <p className={styles.heroDescription}>
              Quản lý rập sản xuất, file kỹ thuật, nguồn rập và liên kết Tech Pack trong một nơi.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button type="button" className="admin-btn" onClick={() => setImporting(true)}>
              <FileUp size={15} />
              &nbsp;Nhập hàng loạt
            </button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
              <Plus size={15} />
              &nbsp;Tạo rập
            </button>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Tổng rập</span>
              <strong className={styles.statValue}>{stats.all}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Bản nháp</span>
              <strong className={styles.statValue}>{stats.draft}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Đã duyệt</span>
              <strong className={styles.statValue}>{stats.approved}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Lưu trữ</span>
              <strong className={styles.statValue}>{stats.archived}</strong>
            </div>
          </div>
        </div>

        <div className={styles.toolbar} data-testid="pattern-workspace-toolbar">
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <input
              className={`admin-input ${styles.searchInput}`}
              placeholder="Tìm mã rập, tên, sản phẩm, khách hàng, nhà cung cấp..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
          </div>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
          <button type="button" className="admin-btn" onClick={applySearch}>
            Lọc
          </button>
        </div>

        {loading ? (
          <AdminLoadingState label="Đang tải thư viện rập..." />
        ) : error && items.length === 0 ? (
          <EmptyState
            tone="error"
            title="Không tải được thư viện rập"
            description={error}
            action={
              <button type="button" className="admin-btn" onClick={() => void load()}>
                Thử lại
              </button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={statusFilter || appliedSearch ? "Không tìm thấy rập phù hợp" : "Chưa có rập"}
            description={
              statusFilter || appliedSearch
                ? "Thử đổi từ khóa hoặc trạng thái."
                : "Tạo rập đầu tiên hoặc nhập dữ liệu rập cũ từ máy tính."
            }
            action={
              !statusFilter && !appliedSearch ? (
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => setImporting(true)}>
                  Nhập rập cũ
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {error && <p className="admin-error">{error}</p>}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th aria-label="Ảnh" />
                    <th>Rập</th>
                    <th>Kỹ thuật</th>
                    <th>Trạng thái</th>
                    <th>Nguồn</th>
                    <th>Liên kết</th>
                    <th>File</th>
                    <th>Cập nhật</th>
                    <th aria-label="Hành động" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <PatternCategoryThumbnail
                          category={normalizePatternCategoryVisual(row.productCategory)}
                          size="list"
                        />
                      </td>
                      <td>
                        <div className={styles.patternIdentity}>
                          <span className={styles.patternCode}>{row.code}</span>
                          <Link href={patternAdminDetailPath(row.id)} className={styles.patternName}>
                            {row.name}
                          </Link>
                          <span className={styles.subtle}>
                            {row.product?.name ?? row.productCategory?.name ?? "Chưa gắn sản phẩm"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.metaStack}>
                          <span className={styles.metaStrong}>V{row.version}</span>
                          <span className={styles.subtle}>{technicalSummary(row)}</span>
                        </div>
                      </td>
                      <td>
                        <PatternStatusBadge status={row.status} />
                      </td>
                      <td>
                        <div className={styles.metaStack}>
                          <span>{formatPatternSourceLabel(row.sourceType) ?? "—"}</span>
                          <span className={styles.subtle}>
                            {formatPatternSupplierListLabel({
                              code: row.sourceSupplierCode,
                              name: row.sourceSupplier,
                              patternSupplier: row.patternSupplier,
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.metaStack}>
                          <span>{row.customer?.name ?? row.customerNameSnapshot ?? "—"}</span>
                          <span className={styles.linkCount}>
                            {row._count?.techPacks ?? 0} Tech Pack
                          </span>
                        </div>
                      </td>
                      <td>{row._count?.files ?? 0}</td>
                      <td>
                        <span className={styles.subtle}>{formatPatternListDate(row.updatedAt)}</span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={patternAdminDetailPath(row.id)} className="admin-btn admin-btn--sm">
                            Mở
                          </Link>
                          <details className={styles.actionMenu}>
                            <summary className={styles.actionMenuButton} aria-label="Thêm hành động">
                              <MoreHorizontal size={16} />
                            </summary>
                            <div className={styles.actionMenuPanel}>
                              {row.status !== "ARCHIVED" && (
                                <button
                                  type="button"
                                  className={styles.menuButton}
                                  onClick={() => void handleArchive(row)}
                                  disabled={archivingId === row.id}
                                >
                                  <Archive size={13} />
                                  &nbsp;{archivingId === row.id ? "Đang lưu trữ..." : "Lưu trữ"}
                                </button>
                              )}
                              {canDeletePattern && (
                                <button
                                  type="button"
                                  className={`${styles.menuButton} ${styles.menuButtonDanger}`}
                                  onClick={() => void handleDelete(row)}
                                  disabled={deletingId === row.id}
                                >
                                  <Trash2 size={13} />
                                  &nbsp;{deletingId === row.id ? "Đang xóa..." : "Xóa vĩnh viễn"}
                                </button>
                              )}
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>
                Hiển thị {firstItem}–{lastItem} / {total} rập
              </span>
              <div className={styles.paginationActions}>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>Trang {page} / {pageCount}</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page >= pageCount}
                  aria-label="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {creating && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={(event) => void handleCreate(event)}>
            <h3>Tạo rập mới</h3>
            <label className="admin-field">
              <span>Tên rập</span>
              <input
                className="admin-input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Ví dụ: Jersey oversize unisex"
                required
              />
            </label>
            <p className={styles.subtle}>
              Sau khi tạo, bạn sẽ bổ sung danh mục, size, nguồn rập, file và bảng thông số ở trang chi tiết.
            </p>
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setCreating(false)}>
                Hủy
              </button>
              <button type="submit" className="admin-btn admin-btn--primary">
                Tạo rập
              </button>
            </div>
          </form>
        </div>
      )}

      {importing && (
        <PatternBulkImportDialog
          onClose={() => setImporting(false)}
          onImported={() => {
            setPage(1);
            void load();
          }}
        />
      )}
    </AdminPageShell>
  );
}
