"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LandingPageRow = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  updatedAt: string;
};

export default function LandingPagesManager() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageRow[]>([]);
  const [tableReady, setTableReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/landing-pages");
      const data = await res.json();
      setTableReady(data.tableReady !== false);
      setPages(Array.isArray(data.pages) ? data.pages : []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh sách landing pages" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function togglePublish(slug: string, isPublished: boolean) {
    const res = await fetch(`/api/landing-pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
      return;
    }
    setMessage({
      type: "success",
      text: isPublished ? "Đã publish landing page" : "Đã unpublish landing page",
    });
    await load();
    router.refresh();
  }

  function formatUpdatedAt(iso: string) {
    return new Date(iso).toLocaleString("vi-VN");
  }

  return (
    <div className="admin-panel">
      {!tableReady && (
        <p className="admin-message admin-message--error" role="alert">
          LandingPageContent table chưa tồn tại. Chạy prisma migrate deploy.
        </p>
      )}

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      {loading ? (
        <p className="admin-loading">Đang tải...</p>
      ) : pages.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có landing page trong CMS.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Title</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <code>{page.slug}</code>
                  </td>
                  <td>{page.title}</td>
                  <td>{page.isPublished ? "Published" : "Draft"}</td>
                  <td>{formatUpdatedAt(page.updatedAt)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <Link href={`/admin/landing-pages/${page.slug}`}>Sửa</Link>
                      <button
                        type="button"
                        onClick={() => togglePublish(page.slug, !page.isPublished)}
                      >
                        {page.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
