"use client";

import { useCallback, useEffect, useState } from "react";

type GroupResult = { created: number; updated: number; skipped: number; total: number };

type SeedSummary = {
  categories: GroupResult;
  products: GroupResult;
  variants: GroupResult;
  blogCategories: GroupResult;
  blogPosts: GroupResult;
  landingPages: GroupResult;
  kbCategories: GroupResult;
  kbEntries: GroupResult;
  clientLogos: GroupResult;
  caseStudies: GroupResult;
};

type StatusData = {
  demo: { products: number; variants: number; blogPosts: number; kbEntries: number; clientLogos: number; caseStudies: number };
  total: { products: number; variants: number; blogPosts: number; kbEntries: number; clientLogos: number; caseStudies: number; categories: number; blogCategories: number; kbCategories: number; landingPages: number };
};

const MODULE_BUTTONS = [
  { label: "Tạo demo sản phẩm", groups: ["products"], icon: "👕" },
  { label: "Tạo demo bài viết", groups: ["blog"], icon: "✍️" },
  { label: "Tạo demo landing page", groups: ["landing"], icon: "📄" },
  { label: "Tạo demo Knowledge Base", groups: ["kb"], icon: "📚" },
  { label: "Tạo demo logo & dự án", groups: ["clients"], icon: "🏢" },
];

function GroupResultRow({ label, result }: { label: string; result: GroupResult }) {
  if (result.total === 0) return null;
  return (
    <div className="admin-demo-result-row">
      <span className="admin-demo-result-label">{label}</span>
      <span className="admin-demo-result-stat admin-demo-result-created">+{result.created} tạo mới</span>
      <span className="admin-demo-result-stat admin-demo-result-updated">↻{result.updated} cập nhật</span>
      <span className="admin-demo-result-stat admin-demo-result-skipped">– {result.skipped} bỏ qua</span>
    </div>
  );
}

function StatusCard({ label, demoCount, totalCount }: { label: string; demoCount: number; totalCount: number }) {
  return (
    <div className="admin-demo-status-card">
      <div className="admin-demo-status-count">{demoCount}</div>
      <div className="admin-demo-status-total">/ {totalCount}</div>
      <div className="admin-demo-status-label">{label}</div>
    </div>
  );
}

export default function DemoContentSeeder() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<SeedSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<Record<string, number> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/demo/status");
      const data = await res.json() as { ok: boolean } & StatusData;
      if (data.ok) setStatus(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  async function runSeed(groups: string[]) {
    setSeeding(true);
    setError(null);
    setResult(null);
    setDeleteResult(null);
    try {
      const res = await fetch("/api/admin/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });
      const data = await res.json() as { ok: boolean; summary?: SeedSummary; message?: string };
      if (!data.ok) throw new Error(data.message ?? "Lỗi tạo dữ liệu demo");
      setResult(data.summary ?? null);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Xác nhận xóa toàn bộ dữ liệu demo? Hành động này không thể hoàn tác.")) return;
    setDeleting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/demo/seed", { method: "DELETE" });
      const data = await res.json() as { ok: boolean; deleted?: Record<string, number>; message?: string };
      if (!data.ok) throw new Error(data.message ?? "Lỗi xóa dữ liệu demo");
      setDeleteResult(data.deleted ?? null);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-demo-page">
      <div className="admin-demo-intro">
        <h2 className="admin-subtitle">Dữ liệu demo website</h2>
        <p>Tạo dữ liệu demo để xem website như một theme mẫu. Dữ liệu demo không thay thế dữ liệu thật — seeder idempotent, chạy nhiều lần không tạo trùng lặp.</p>
        <div className="admin-demo-quick-links">
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">🌐 Xem website</a>
          <a href="/san-pham" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">👕 Xem sản phẩm</a>
          <a href="/blog" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">✍️ Xem blog</a>
          <a href="/admin/products" className="admin-btn admin-btn--secondary admin-btn--xs">⚙ Admin sản phẩm</a>
          <a href="/admin/blog" className="admin-btn admin-btn--secondary admin-btn--xs">⚙ Admin blog</a>
        </div>
      </div>

      {/* Status panel */}
      {status && (
        <div className="admin-catalog-fieldset">
          <div className="admin-demo-status-header">
            <span className="admin-subtitle" style={{ margin: 0 }}>Trạng thái hiện tại</span>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void loadStatus()}>↻ Làm mới</button>
          </div>
          <p className="admin-field-hint">Demo / Tổng số bản ghi trong hệ thống</p>
          <div className="admin-demo-status-grid">
            <StatusCard label="Sản phẩm" demoCount={status.demo.products} totalCount={status.total.products} />
            <StatusCard label="Biến thể" demoCount={status.demo.variants} totalCount={status.total.variants} />
            <StatusCard label="Bài viết" demoCount={status.demo.blogPosts} totalCount={status.total.blogPosts} />
            <StatusCard label="KB Entries" demoCount={status.demo.kbEntries} totalCount={status.total.kbEntries} />
            <StatusCard label="Logo KH" demoCount={status.demo.clientLogos} totalCount={status.total.clientLogos} />
            <StatusCard label="Dự án" demoCount={status.demo.caseStudies} totalCount={status.total.caseStudies} />
          </div>
          <div className="admin-demo-totals">
            <span className="admin-field-hint">Danh mục SP: {status.total.categories}</span>
            <span className="admin-field-hint">Blog categories: {status.total.blogCategories}</span>
            <span className="admin-field-hint">KB categories: {status.total.kbCategories}</span>
            <span className="admin-field-hint">Landing pages: {status.total.landingPages}</span>
          </div>
        </div>
      )}

      {/* Seed actions */}
      <div className="admin-catalog-fieldset">
        <span className="admin-subtitle" style={{ display: "block", marginBottom: 12 }}>Tạo dữ liệu demo</span>

        <div className="admin-demo-actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={seeding || deleting}
            onClick={() => void runSeed(["all"])}
          >
            {seeding ? "⏳ Đang tạo…" : "🚀 Tạo toàn bộ demo"}
          </button>

          {MODULE_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={seeding || deleting}
              onClick={() => void runSeed(btn.groups)}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result panel */}
      {result && (
        <div className="admin-catalog-fieldset" style={{ borderColor: "#d1fae5", background: "#f0fdf4" }}>
          <p className="admin-subtitle" style={{ margin: "0 0 12px", color: "#065f46" }}>✓ Kết quả tạo demo</p>
          <div className="admin-demo-results">
            <GroupResultRow label="Danh mục SP" result={result.categories} />
            <GroupResultRow label="Sản phẩm" result={result.products} />
            <GroupResultRow label="Biến thể / SKU" result={result.variants} />
            <GroupResultRow label="Blog categories" result={result.blogCategories} />
            <GroupResultRow label="Bài viết" result={result.blogPosts} />
            <GroupResultRow label="Landing pages" result={result.landingPages} />
            <GroupResultRow label="KB categories" result={result.kbCategories} />
            <GroupResultRow label="KB Entries" result={result.kbEntries} />
            <GroupResultRow label="Logo khách hàng" result={result.clientLogos} />
            <GroupResultRow label="Dự án tiêu biểu" result={result.caseStudies} />
          </div>
        </div>
      )}

      {deleteResult && (
        <div className="admin-catalog-fieldset" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          <p className="admin-subtitle" style={{ margin: "0 0 8px", color: "#7f1d1d" }}>✓ Đã xóa dữ liệu demo</p>
          <div className="admin-demo-results">
            {Object.entries(deleteResult).map(([key, count]) => (
              <div key={key} className="admin-demo-result-row">
                <span className="admin-demo-result-label">{key}</span>
                <span className="admin-demo-result-stat admin-demo-result-created">- {count} đã xóa</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="admin-error">{error}</p>}

      {/* Danger zone */}
      <div className="admin-catalog-fieldset" style={{ borderColor: "#fca5a5" }}>
        <p className="admin-subtitle" style={{ margin: "0 0 8px", color: "#7f1d1d" }}>⚠ Khu vực nguy hiểm</p>
        <p className="admin-field-hint">Chỉ xóa các bản ghi được đánh dấu là demo. Không xóa dữ liệu thật.</p>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={seeding || deleting}
          style={{ borderColor: "#dc2626", color: "#dc2626" }}
          onClick={() => void handleDelete()}
        >
          {deleting ? "⏳ Đang xóa…" : "🗑 Xóa dữ liệu demo"}
        </button>
      </div>
    </div>
  );
}
