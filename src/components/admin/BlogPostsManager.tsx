"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogPostStatus } from "@prisma/client";
import { BLOG_POST_STATUSES, BLOG_STATUS_LABELS } from "@/features/blog/types";
import type { BlogCategoryRecord, BlogPostListItem } from "@/features/blog/types";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

export default function BlogPostsManager() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);

      const [postsRes, catsRes] = await Promise.all([
        fetch(`/api/blog/posts?${params.toString()}`),
        fetch("/api/blog/categories"),
      ]);
      const postsData = await postsRes.json();
      const catsData = await catsRes.json();

      setPosts(Array.isArray(postsData.posts) ? postsData.posts : []);
      setCategories(Array.isArray(catsData.categories) ? catsData.categories : []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh sách bài viết" });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchAction(id: string, action: "publish" | "unpublish" | "delete") {
    if (action === "delete" && !window.confirm("Xóa bài viết này?")) return;

    const url = `/api/blog/posts/${id}`;
    const res = await fetch(url, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Thao tác thất bại" });
      return;
    }

    setMessage({
      type: "success",
      text:
        action === "publish"
          ? "Đã publish bài viết"
          : action === "unpublish"
            ? "Đã unpublish bài viết"
            : "Đã xóa bài viết",
    });
    await load();
    router.refresh();
  }

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    void load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div />
        <div className="admin-panel-actions">
          <Link href="/admin/blog/categories" className="admin-btn admin-btn--secondary">
            Danh mục
          </Link>
          <Link href="/admin/blog/new" className="admin-btn">
            + Bài viết mới
          </Link>
        </div>
      </div>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <form className="admin-crm-filters" onSubmit={applyFilters}>
        <input
          type="search"
          placeholder="Tìm tiêu đề, slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input"
        />
        <select
          className="admin-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BlogPostStatus | "")}
        >
          <option value="">Tất cả trạng thái</option>
          {BLOG_POST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BLOG_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <button type="submit" className="admin-btn admin-btn--secondary">
          Lọc
        </button>
      </form>

      {loading ? (
        <p className="admin-loading">Đang tải...</p>
      ) : posts.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có bài viết.</p>
          <Link href="/admin/blog/new" className="admin-btn">
            Tạo bài viết đầu tiên
          </Link>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Ngày publish</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>
                    {post.categories.length > 0
                      ? post.categories.map((c) => c.name).join(", ")
                      : "—"}
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge--${post.status.toLowerCase()}`}>
                      {BLOG_STATUS_LABELS[post.status]}
                    </span>
                  </td>
                  <td>{formatDate(post.publishedAt)}</td>
                  <td>{formatDate(post.updatedAt)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <Link href={`/admin/blog/${post.id}`}>Sửa</Link>
                      {post.status === "PUBLISHED" && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-link-button"
                        >
                          Xem
                        </a>
                      )}
                      {post.status !== "PUBLISHED" ? (
                        <button type="button" onClick={() => void patchAction(post.id, "publish")}>
                          Publish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void patchAction(post.id, "unpublish")}
                        >
                          Unpublish
                        </button>
                      )}
                      <button type="button" onClick={() => void patchAction(post.id, "delete")}>
                        Xóa
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
