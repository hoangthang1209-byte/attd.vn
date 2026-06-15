"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BlogPostStatus } from "@prisma/client";
import BlogAiReadinessPanel from "@/components/admin/BlogAiReadinessPanel";
import BlogAiRecommendationsPanel from "@/components/admin/BlogAiRecommendationsPanel";
import BlogFaqBuilder from "@/components/admin/BlogFaqBuilder";
import BlogSeoPanel from "@/components/admin/BlogSeoPanel";
import BlogTagInput from "@/components/admin/BlogTagInput";
import BlogClusterGenerator from "@/components/admin/BlogClusterGenerator";
import AiContentFactory from "@/components/admin/blog-editor/AiContentFactory";
import type { ClusterArticle } from "@/features/blog/content-clusters";
import type { ClusterType } from "@/features/blog/content-clusters-types";
import { clusterArticleToHandoff, type ClusterHandoffRequest } from "@/features/blog/cluster-handoff";
import { parseHandoffFromSearchParams } from "@/features/blog/seo-planning";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";
import type { GeneratedArticle } from "@/features/blog/ai-article-generator";
import type { AiFaqResult, AiSeoResult, AiTagsResult } from "@/features/blog/ai-provider";
import type { SeoRecommendations } from "@/features/blog/seo-recommendations";
import { generateDemoBlogArticle } from "@/features/blog/demo-article-generator";
import { contentToEditorMarkdown } from "@/features/blog/html-to-markdown";
import { getPublishWarnings, calculateSeoScore } from "@/features/blog/seo-score";
import { getPublishReadiness } from "@/features/blog/content-health";
import { normalizeBlogTags } from "@/features/blog/tags";
import { BLOG_POST_STATUSES, BLOG_STATUS_LABELS } from "@/features/blog/types";
import type { BlogCategoryRecord, BlogFaqItem, BlogPostRecord } from "@/features/blog/types";
import { canonicalUrl as buildCanonicalUrl } from "@/lib/seo";
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

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function statusBadgeClass(status: BlogPostStatus): string {
  if (status === "PUBLISHED") return "admin-badge--published";
  if (status === "REVIEW") return "admin-badge--review";
  return "admin-badge--draft";
}

export default function BlogPostEditor(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryHandoffProcessedRef = useRef(false);
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
  const [updatedAt, setUpdatedAt] = useState<string | null>(initial?.updatedAt ?? null);
  const [aiRecommendations, setAiRecommendations] = useState<SeoRecommendations | null>(null);
  const editorSectionRef = useRef<HTMLDivElement>(null);
  const factorySectionRef = useRef<HTMLDivElement>(null);
  const [clusterHandoff, setClusterHandoff] = useState<ClusterHandoffRequest | null>(null);
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

  useEffect(() => {
    if (queryHandoffProcessedRef.current) return;
    const handoff = parseHandoffFromSearchParams(searchParams);
    if (!handoff) return;
    queryHandoffProcessedRef.current = true;
    setClusterHandoff(handoff);
    factorySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function applyAiArticle(result: GeneratedArticle): boolean {
    const hasExisting = Boolean(title.trim() || markdown.trim());
    if (hasExisting) {
      const proceed = window.confirm("Thay thế nội dung hiện tại bằng bài viết AI?");
      if (!proceed) return false;
    }
    setTitle(result.title);
    if (!slugEdited) setSlug(result.slug);
    setExcerpt(result.excerpt);
    setMarkdown(result.markdown);
    setTags(normalizeBlogTags(result.tags));
    setFaqJson(result.faqJson);
    setMetaTitle(result.metaTitle);
    setMetaDescription(result.metaDescription);
    if (aiRecommendations?.suggestedCategoryIds.length) {
      setCategoryIds((prev) => [
        ...new Set([...prev, ...aiRecommendations.suggestedCategoryIds]),
      ]);
    }
    return true;
  }

  function applyAiSeo(result: AiSeoResult) {
    if (result.title) setTitle(result.title);
    if (result.excerpt) setExcerpt(result.excerpt);
    setMetaTitle(result.metaTitle);
    setMetaDescription(result.metaDescription);
  }

  function applyAiFaq(result: AiFaqResult) {
    setFaqJson(result.faqJson);
  }

  function applyAiTags(result: AiTagsResult) {
    setTags(normalizeBlogTags(result.tags));
  }

  function applyDemoArticle() {
    const hasExisting = Boolean(title.trim() || markdown.trim() || excerpt.trim());
    if (hasExisting) {
      const proceed = window.confirm(
        "Thay thế tiêu đề, tóm tắt, nội dung và tags bằng bài demo SEO?"
      );
      if (!proceed) return;
    }

    const demo = generateDemoBlogArticle();
    setTitle(demo.title);
    if (!slugEdited) setSlug(toSlug(demo.title));
    setExcerpt(demo.excerpt);
    setMarkdown(demo.markdown);
    setTags(normalizeBlogTags(demo.tags));
    setMessage({ type: "success", text: "Đã tạo bài demo markdown (~1.650 từ)." });
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  }

  async function copyArticleUrl() {
    const trimmedSlug = slug.trim();
    if (!trimmedSlug) return;

    const url = buildCanonicalUrl(`/blog/${trimmedSlug}`);
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: "success", text: "Đã sao chép URL bài viết." });
    } catch {
      setMessage({ type: "error", text: "Không thể sao chép URL." });
    }
  }

  function handleClusterCreateArticle(article: ClusterArticle, clusterType: ClusterType) {
    setClusterHandoff(clusterArticleToHandoff(article, clusterType));
    factorySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

      if (typeof data.post?.updatedAt === "string") {
        setUpdatedAt(data.post.updatedAt);
      }

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

  const publishReadiness = getPublishReadiness(
    calculateSeoScore({
      title,
      metaTitle,
      metaDescription,
      featuredImageUrl: featuredImage?.url ?? null,
      content: markdown,
      faqJson,
      tags,
    }).score
  );

  const trimmedSlug = slug.trim();
  const publicArticlePath = trimmedSlug ? `/blog/${trimmedSlug}` : null;

  return (
    <div className="admin-panel">
      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <div className="admin-editor-nav">
        <Link href="/admin/blog" className="admin-btn admin-btn--secondary admin-btn--small">
          ← Danh sách bài viết
        </Link>
      </div>

      <div className="admin-form-grid">
        <div className="admin-form-main">
          <div ref={factorySectionRef} className="admin-factory-section">
            <AiContentFactory
              categories={categories}
              onApplyArticle={applyAiArticle}
              onApplySeo={applyAiSeo}
              onApplyFaq={applyAiFaq}
              onApplyTags={applyAiTags}
              onRecommendationsChange={setAiRecommendations}
              onMessage={(text, type) => setMessage({ text, type })}
              onScrollToEditor={() => {
                editorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              handoff={clusterHandoff}
              onHandoffConsumed={() => setClusterHandoff(null)}
            />

            <BlogClusterGenerator
              onCreateArticle={handleClusterCreateArticle}
              onMessage={(text, type) => setMessage({ text, type })}
            />
          </div>

          <div ref={editorSectionRef} className="admin-editor-section" id="blog-editor-section">
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
            <div className="admin-field-header-row">
              <label className="admin-label">Nội dung</label>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={applyDemoArticle}
              >
                Tạo bài demo
              </button>
            </div>
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
        </div>

        <aside className="admin-form-sidebar">
          <BlogAiReadinessPanel
            content={markdown}
            faqJson={faqJson}
            tags={tags}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
          />

          <BlogAiRecommendationsPanel
            recommendations={aiRecommendations}
            categories={categories}
            selectedCategoryIds={categoryIds}
            onApplyTags={(nextTags) => setTags(normalizeBlogTags(nextTags))}
            onApplyFaqs={() => {
              if (aiRecommendations?.suggestedFaqs) {
                setFaqJson(aiRecommendations.suggestedFaqs);
              }
            }}
            onApplyCategories={setCategoryIds}
          />

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
            <div className="admin-publish-card-header">
              <h3 className="admin-sidebar-title">Xuất bản</h3>
              <span className={`admin-badge ${statusBadgeClass(status)}`}>
                {BLOG_STATUS_LABELS[status]}
              </span>
            </div>
            <p
              className={`admin-publish-readiness admin-publish-readiness--${publishReadiness.level}`}
            >
              {publishReadiness.label}
            </p>
            {updatedAt && (
              <p className="admin-publish-updated">
                Cập nhật lần cuối: {formatUpdatedAt(updatedAt)}
              </p>
            )}
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
              {publicArticlePath && (
                <>
                  <a
                    href={publicArticlePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn--secondary"
                  >
                    Xem bài viết
                  </a>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={() => void copyArticleUrl()}
                  >
                    Sao chép URL
                  </button>
                </>
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
