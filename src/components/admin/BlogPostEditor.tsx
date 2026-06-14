"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogPostStatus } from "@prisma/client";
import BlogFaqBuilder from "@/components/admin/BlogFaqBuilder";
import BlogSeoPanel from "@/components/admin/BlogSeoPanel";
import BlogTagInput from "@/components/admin/BlogTagInput";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";
import { contentToEditorMarkdown } from "@/features/blog/html-to-markdown";
import { getPublishWarnings } from "@/features/blog/seo-score";
import { normalizeBlogTags } from "@/features/blog/tags";
import { BLOG_POST_STATUSES, BLOG_STATUS_LABELS } from "@/features/blog/types";
import type { BlogCategoryRecord, BlogFaqItem, BlogPostRecord } from "@/features/blog/types";
import { toSlug } from "@/lib/slug";

const BlogVisualEditor = dynamic(
  () => import("@/components/admin/blog-editor/BlogVisualEditor"),
  {
    ssr: false,
    loading: () => <p className="admin-loading">Đang tải editor...</p>,
  }
);

type Props =
  | { mode: "create" }
  | { mode: "edit"; post: BlogPostRecord };

function toMediaValue(url: string | null): MediaPickerValue | null {
  if (!url) return null;
  return { id: url, url, filename: url.split("/").pop() ?? "image" };
}

export default function BlogPostEditor(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.post : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [markdown, setMarkdown] = useState("");
  const [featuredImage, setFeaturedImage] = useState<MediaPickerValue | null>(
    toMediaValue(initial?.featuredImageUrl ?? null)
  );
  const [ogImage, setOgImage] = useState<MediaPickerValue | null>(
    toMediaValue(initial?.ogImageUrl ?? null)
  );
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(initial?.canonicalUrl ?? "");
  const [status, setStatus] = useState<BlogPostStatus>(initial?.status ?? "DRAFT");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categories.map((c) => c.id) ?? []
  );
  const [faqJson, setFaqJson] = useState<BlogFaqItem[]>(initial?.faqJson ?? []);
  const [tags, setTags] = useState<string[]>(normalizeBlogTags(initial?.tags ?? []));
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  useEffect(() => {
    setMarkdown(contentToEditorMarkdown(initial?.content));
  }, [initial?.content]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/blog/categories");
    const data = await res.json();
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  }

  async function save(nextStatus?: BlogPostStatus) {
    setMessage(null);

    if (!title.trim()) {
      setMessage({ type: "error", text: "Tiêu đề là bắt buộc." });
      return;
    }
    if (!slug.trim()) {
      setMessage({ type: "error", text: "Slug là bắt buộc." });
      return;
    }

    if (nextStatus === "PUBLISHED") {
      const warnings = getPublishWarnings({
        featuredImageUrl: featuredImage?.url ?? null,
        metaTitle,
        metaDescription,
        content: markdown,
      });
      if (warnings.length > 0) {
        const proceed = window.confirm(
          `Cảnh báo trước khi publish:\n\n- ${warnings.join("\n- ")}\n\nVẫn publish?`
        );
        if (!proceed) return;
      }
    }

    const normalizedTags = normalizeBlogTags(tags);

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content: markdown.trim() || null,
        featuredImageUrl: featuredImage?.url ?? null,
        ogImageUrl: ogImage?.url ?? null,
        metaTitle: metaTitle.trim() || null,
        metaDescription: metaDescription.trim() || null,
        canonicalUrl: canonicalUrl.trim() || null,
        status: nextStatus ?? status,
        categoryIds,
        faqJson,
        tags: normalizedTags,
      };

      const url = isEdit ? `/api/blog/posts/${initial!.id}` : "/api/blog/posts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
        return;
      }

      setTags(normalizedTags);
      setMessage({ type: "success", text: isEdit ? "Đã lưu bài viết." : "Đã tạo bài viết." });

      if (!isEdit && data.post?.id) {
        router.push(`/admin/blog/${data.post.id}`);
        router.refresh();
        return;
      }

      if (nextStatus) setStatus(nextStatus);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-panel">
      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <div className="admin-form-grid">
        <div className="admin-form-main">
          <div className="admin-field">
            <label className="admin-label">
              Tiêu đề <span className="admin-required">*</span>
            </label>
            <input
              className="admin-input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ví dụ: Cách chọn áo thun trơn sỉ cho đại lý"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">
              Slug <span className="admin-required">*</span>
            </label>
            <input
              className="admin-input"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
            />
            <p className="admin-field-hint">attd.vn/blog/{slug || "slug-bai-viet"}</p>
          </div>

          <div className="admin-field">
            <label className="admin-label">Tóm tắt</label>
            <textarea
              className="admin-textarea"
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Mô tả ngắn hiển thị trên trang danh sách blog"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label">Nội dung</label>
            <BlogVisualEditor value={markdown} onChange={setMarkdown} />
          </div>

          <div className="admin-sidebar-card">
            <BlogFaqBuilder items={faqJson} onChange={setFaqJson} />
          </div>

          <div className="admin-field">
            <label className="admin-label">Tags</label>
            <BlogTagInput tags={tags} onChange={setTags} />
          </div>
        </div>

        <aside className="admin-form-sidebar">
          <BlogSeoPanel
            title={title}
            slug={slug}
            excerpt={excerpt}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            featuredImageUrl={featuredImage?.url ?? null}
            content={markdown}
            faqJson={faqJson}
            tags={tags}
          />

          <div className="admin-sidebar-card">
            <h3 className="admin-sidebar-title">Xuất bản</h3>
            <select
              className="admin-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as BlogPostStatus)}
            >
              {BLOG_POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BLOG_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <div className="admin-form-actions admin-form-actions--stack">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo bài viết"}
              </button>
              {isEdit && status !== "PUBLISHED" && (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  disabled={saving}
                  onClick={() => void save("PUBLISHED")}
                >
                  Publish
                </button>
              )}
              {isEdit && (
                <a
                  href={`/blog/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-link-button"
                >
                  Xem
                </a>
              )}
            </div>
          </div>

          <div className="admin-sidebar-card">
            <h3 className="admin-sidebar-title">Danh mục</h3>
            {categories.length === 0 ? (
              <p className="admin-field-hint">
                Chưa có danh mục.{" "}
                <Link href="/admin/blog/categories">Tạo danh mục</Link>
              </p>
            ) : (
              <div className="admin-checkbox-list">
                {categories.map((cat) => (
                  <label key={cat.id} className="admin-checkbox-item">
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="admin-sidebar-card">
            <h3 className="admin-sidebar-title">Ảnh</h3>
            <MediaPicker
              label="Featured Image"
              folder="blog"
              value={featuredImage}
              onChange={setFeaturedImage}
            />
            <MediaPicker
              label="OG Image"
              folder="blog"
              value={ogImage}
              onChange={setOgImage}
            />
          </div>

          <div className="admin-sidebar-card">
            <h3 className="admin-sidebar-title">SEO</h3>
            <div className="admin-field">
              <label className="admin-label">Meta Title</label>
              <input
                className="admin-input"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={255}
                placeholder={`${title || "Tiêu đề"} | ATTD`}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Meta Description</label>
              <textarea
                className="admin-textarea"
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Canonical URL</label>
              <input
                className="admin-input"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder={`https://www.attd.vn/blog/${slug}`}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
