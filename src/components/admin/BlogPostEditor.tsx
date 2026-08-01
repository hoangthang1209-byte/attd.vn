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
import BlogMediaWorkspace from "@/components/admin/blog-editor/BlogMediaWorkspace";
import BlogReadinessSidebar from "@/components/admin/blog-editor/BlogReadinessSidebar";
import BlogTraceabilityTimeline from "@/components/admin/blog-editor/BlogTraceabilityTimeline";
import BlogWorkspaceTabs, {
  WorkspaceSection,
  WorkspaceTabPanel,
  type WorkspaceTab,
} from "@/components/admin/blog-editor/BlogWorkspaceTabs";
import { useBlogReadiness } from "@/components/admin/blog-editor/useBlogReadiness";
import type { ClusterArticle } from "@/features/blog/content-clusters";
import type { ClusterType } from "@/features/blog/content-clusters-types";
import { clusterArticleToHandoff, type ClusterHandoffRequest } from "@/features/blog/cluster-handoff";
import { parseHandoffFromSearchParams } from "@/features/blog/seo-planning";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";
import type { GeneratedArticle } from "@/features/blog/ai-article-generator";
import type { AiFaqResult, AiSeoResult, AiTagsResult } from "@/features/blog/ai-provider";
import type { AiGenerationMetadata } from "@/components/admin/blog-editor/AiContentFactory";
import type { SeoRecommendations } from "@/features/blog/seo-recommendations";
import { generateDemoBlogArticle } from "@/features/blog/demo-article-generator";
import { contentToEditorMarkdown } from "@/features/blog/html-to-markdown";
import { normalizeBlogTags } from "@/features/blog/tags";
import { BLOG_POST_STATUSES, BLOG_STATUS_LABELS } from "@/features/blog/types";
import BlogPublishPanel from "@/components/admin/blog-editor/BlogPublishPanel";
import type { BlogCategoryRecord, BlogFaqItem, BlogPostRecord } from "@/features/blog/types";
import { canonicalUrl as buildCanonicalUrl } from "@/lib/seo";
import { toSlug } from "@/lib/slug";
import PanelSkeleton from "@/components/ui/loading/PanelSkeleton";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

const BlogVisualEditor = dynamic(
  () => import("@/components/admin/blog-editor/BlogVisualEditor"),
  {
    ssr: false,
    loading: () => <PanelSkeleton label="Đang tải trình soạn thảo…" lines={2} block />,
  }
);

type Props =
  | { mode: "create" }
  | { mode: "edit"; post: BlogPostRecord };

type WorkspaceTabId = "editor" | "seo" | "publishing" | "ai" | "traceability";

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
  if (status === "SCHEDULED") return "admin-badge--review";
  if (status === "ARCHIVED") return "admin-badge--draft";
  return "admin-badge--draft";
}

function contentLooksLikeMarkdown(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (/<figure[\s>]/i.test(trimmed) || /<p[\s>]/i.test(trimmed) || /<div[\s>]/i.test(trimmed)) {
    return false;
  }
  return true;
}

function inlineHtmlToMarkdown(html: string): string | null {
  const srcMatch = html.match(/src="([^"]+)"/);
  if (!srcMatch?.[1]) return null;
  const altMatch = html.match(/alt="([^"]*)"/);
  const alt = altMatch?.[1] ?? "";
  return `\n\n![${alt}](${srcMatch[1]})\n\n`;
}

export default function BlogPostEditor(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryHandoffProcessedRef = useRef(false);
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.post : null;

  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("editor");
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
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initial?.updatedAt ?? null);
  const [aiRecommendations, setAiRecommendations] = useState<SeoRecommendations | null>(null);
  const editorSectionRef = useRef<HTMLDivElement>(null);
  const factorySectionRef = useRef<HTMLDivElement>(null);
  const [clusterHandoff, setClusterHandoff] = useState<ClusterHandoffRequest | null>(null);
  const [aiMetadata, setAiMetadata] = useState<AiGenerationMetadata | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  const { readiness, loading: readinessLoading, refresh: refreshReadiness } = useBlogReadiness({
    postId: initial?.id ?? null,
    title,
    slug,
    metaTitle,
    metaDescription,
    excerpt,
    featuredImageUrl: featuredImage?.url ?? null,
    ogImageUrl: ogImage?.url ?? null,
    content: markdown,
    faqJson,
    tags,
    dirty,
  });

  useEffect(() => {
    setMarkdown(contentToEditorMarkdown(initial?.content));
    setDirty(false);
  }, [initial?.content]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/blog/categories");
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } finally {
      setCategoriesLoading(false);
    }
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
    setActiveTab("ai");
  }, [searchParams]);

  function markDirty() {
    setDirty(true);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    markDirty();
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleContentChange(value: string) {
    setMarkdown(value);
    markDirty();
  }

  function applyAiArticle(result: GeneratedArticle, metadata: AiGenerationMetadata): boolean {
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
    setAiMetadata(metadata);
    markDirty();
    return true;
  }

  function applyAiSeo(result: AiSeoResult) {
    if (result.title) setTitle(result.title);
    if (result.excerpt) setExcerpt(result.excerpt);
    setMetaTitle(result.metaTitle);
    setMetaDescription(result.metaDescription);
    markDirty();
  }

  function applyAiFaq(result: AiFaqResult) {
    setFaqJson(result.faqJson);
    markDirty();
  }

  function applyAiTags(result: AiTagsResult) {
    setTags(normalizeBlogTags(result.tags));
    markDirty();
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
    markDirty();
    setMessage({ type: "success", text: "Đã tạo bài demo markdown (~1.650 từ)." });
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
    markDirty();
  }

  function handleInsertInlineHtml(html: string) {
    markDirty();
    if (contentLooksLikeMarkdown(markdown)) {
      const md = inlineHtmlToMarkdown(html);
      if (md) {
        setMarkdown((prev) => (prev.trim() ? `${prev}${md}` : md.trimStart()));
        return;
      }
    }
    setMarkdown((prev) => (prev.trim() ? `${prev}\n\n${html}` : html));
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
    setActiveTab("ai");
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

    if (nextStatus === "PUBLISHED" && readiness.warnings.length > 0) {
      const proceed = window.confirm(
        `Cảnh báo trước khi publish:\n\n- ${readiness.warnings
          .map((item) => `${item.label}: ${item.display}`)
          .join("\n- ")}\n\nVẫn publish?`
      );
      if (!proceed) return;
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
        aiMetadata: aiMetadata ?? undefined,
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
      setDirty(false);
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
      void refreshReadiness();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
    } finally {
      setSaving(false);
    }
  }

  const trimmedSlug = slug.trim();
  const publicArticlePath = trimmedSlug ? `/blog/${trimmedSlug}` : null;
  const readinessTone =
    !readiness.serverChecked ? "yellow" : readiness.status === "READY" ? "green" : "red";

  const tabs: Array<WorkspaceTab<WorkspaceTabId>> = [
    { id: "editor", label: "Editor" },
    { id: "seo", label: "SEO", badge: `${readiness.quality.score}` },
    {
      id: "publishing",
      label: "Publishing",
      badge: readiness.blockers.length > 0 ? readiness.blockers.length : undefined,
      tone: "danger",
    },
    { id: "ai", label: "AI Assistant" },
    ...(isEdit ? [{ id: "traceability" as const, label: "Traceability" }] : []),
  ];

  return (
    <div className="admin-panel blog-workspace">
      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <header className="blog-workspace-header">
        <div className="blog-workspace-header__identity">
          <Link href="/admin/blog" className="admin-btn admin-btn--secondary admin-btn--small">
            ← Danh sách bài viết
          </Link>
          <span className={`admin-badge ${statusBadgeClass(status)}`}>
            {BLOG_STATUS_LABELS[status]}
          </span>
          <span className={`admin-publish-readiness admin-publish-readiness--${readinessTone}`}>
            {readiness.statusLabel}
          </span>
          {updatedAt && (
            <span className="admin-field-hint">Cập nhật {formatUpdatedAt(updatedAt)}</span>
          )}
          {dirty && <span className="admin-badge admin-badge--warning">Chưa lưu</span>}
        </div>
        <div className="blog-workspace-header__actions">
          <AdminLoadingButton
            variant="primary"
            size="small"
            pending={saving}
            pendingLabel="Đang lưu…"
            onClick={() => void save()}
          >
            {isEdit ? "Lưu" : "Tạo bài viết"}
          </AdminLoadingButton>
          {publicArticlePath && (
            <>
              <a
                href={publicArticlePath}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn--secondary admin-btn--small"
              >
                Xem bài viết
              </a>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => void copyArticleUrl()}
              >
                Sao chép URL
              </button>
            </>
          )}
        </div>
      </header>

      <BlogWorkspaceTabs
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Khu vực làm việc bài viết"
      />

      <div className="blog-workspace-grid">
        <div className="blog-workspace-main">
          <WorkspaceTabPanel id="editor" active={activeTab === "editor"}>
            <WorkspaceSection title="Content" description="Tiêu đề, slug, tóm tắt và nội dung bài viết.">
              <div ref={editorSectionRef} id="blog-editor-section">
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
                      markDirty();
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
                    onChange={(e) => {
                      setExcerpt(e.target.value);
                      markDirty();
                    }}
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
                  <BlogVisualEditor value={markdown} onChange={handleContentChange} />
                </div>
              </div>
            </WorkspaceSection>

            <WorkspaceSection title="FAQ" description="Câu hỏi thường gặp đi kèm bài viết (FAQ schema).">
              <BlogFaqBuilder
                items={faqJson}
                onChange={(items) => {
                  setFaqJson(items);
                  markDirty();
                }}
              />
            </WorkspaceSection>

            <WorkspaceSection
              title="Images"
              description="Featured Image dùng cho trang danh sách và OG; Body Images nằm trong thân bài; Media References là các ảnh gắn từ Media Bundle."
            >
              <div className="blog-images-block">
                <h4 className="blog-images-block__title">Featured Image</h4>
                <MediaPicker
                  label="Featured Image"
                  folder="blog"
                  value={featuredImage}
                  onChange={(value) => {
                    setFeaturedImage(value);
                    markDirty();
                  }}
                />
                <MediaPicker
                  label="OG Image (tùy chọn)"
                  folder="blog"
                  value={ogImage}
                  onChange={(value) => {
                    setOgImage(value);
                    markDirty();
                  }}
                />
                <p className="admin-field-hint">
                  Body Images hiện có: {readiness.metrics.bodyImages} · Media References:{" "}
                  {readiness.metrics.mediaReferences}
                </p>
              </div>

              <BlogMediaWorkspace
                postId={isEdit ? initial!.id : null}
                title={title}
                keywords={tags}
                categoryNames={categories
                  .filter((category) => categoryIds.includes(category.id))
                  .map((category) => category.name)}
                featuredImageUrl={featuredImage?.url ?? null}
                ogImageUrl={ogImage?.url ?? null}
                onFeaturedUrlChange={(url) => setFeaturedImage(toMediaValue(url))}
                onOgUrlChange={(url) => setOgImage(toMediaValue(url))}
                onInsertInlineHtml={handleInsertInlineHtml}
              />
            </WorkspaceSection>

            <WorkspaceSection title="Phân loại" description="Tags và danh mục hiển thị trên blog.">
              <div className="admin-field">
                <label className="admin-label">Tags</label>
                <BlogTagInput
                  tags={tags}
                  onChange={(next) => {
                    setTags(next);
                    markDirty();
                  }}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Danh mục</label>
                {categoriesLoading ? (
                  <PanelSkeleton label="Đang tải danh mục…" lines={3} withTitle={false} />
                ) : categories.length === 0 ? (
                  <p className="admin-field-hint">
                    Chưa có danh mục. <Link href="/admin/blog/categories">Tạo danh mục</Link>
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
            </WorkspaceSection>
          </WorkspaceTabPanel>

          <WorkspaceTabPanel id="seo" active={activeTab === "seo"}>
            <WorkspaceSection title="Metadata" description="Thẻ meta và canonical dùng cho Google.">
              <div className="admin-field">
                <label className="admin-label">Meta Title</label>
                <input
                  className="admin-input"
                  value={metaTitle}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    markDirty();
                  }}
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
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    markDirty();
                  }}
                  maxLength={500}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Canonical URL</label>
                <input
                  className="admin-input"
                  value={canonicalUrl}
                  onChange={(e) => {
                    setCanonicalUrl(e.target.value);
                    markDirty();
                  }}
                  placeholder={`https://www.attd.vn/blog/${slug}`}
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection title="Score" description="Điểm chất lượng nội dung và SERP preview.">
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
            </WorkspaceSection>

            <WorkspaceSection
              title="Recommendations"
              description="Gợi ý từ AI — tham khảo, không bắt buộc."
              tone="ai"
            >
              <BlogAiRecommendationsPanel
                recommendations={aiRecommendations}
                categories={categories}
                selectedCategoryIds={categoryIds}
                onApplyTags={(nextTags) => {
                  setTags(normalizeBlogTags(nextTags));
                  markDirty();
                }}
                onApplyFaqs={() => {
                  if (aiRecommendations?.suggestedFaqs) {
                    setFaqJson(aiRecommendations.suggestedFaqs);
                    markDirty();
                  }
                }}
                onApplyCategories={(ids) => {
                  setCategoryIds(ids);
                  markDirty();
                }}
              />
            </WorkspaceSection>
          </WorkspaceTabPanel>

          <WorkspaceTabPanel id="publishing" active={activeTab === "publishing"}>
            <WorkspaceSection
              title="Readiness"
              description="Blocker phải xử lý xong mới xuất bản được; warning chỉ là khuyến nghị."
              actions={
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={() => void refreshReadiness()}
                >
                  Kiểm tra lại
                </button>
              }
            >
              {readinessLoading ? (
                <PanelSkeleton label="Đang kiểm tra điều kiện xuất bản…" lines={4} />
              ) : (
                <>
                  <p className={`admin-publish-readiness admin-publish-readiness--${readinessTone}`}>
                    {readiness.statusLabel}
                  </p>
                  {readiness.blockers.length === 0 && (
                    <p className="admin-field-hint">Không còn blocker nào.</p>
                  )}
                  <ul className="blog-readiness-issues">
                    {readiness.blockers.map((item) => (
                      <li key={item.code} className="is-blocker">
                        <span className="blog-readiness-issues__tag">Blocker</span> {item.label}
                      </li>
                    ))}
                    {readiness.warnings.map((item) => (
                      <li key={item.code} className="is-warning">
                        <span className="blog-readiness-issues__tag">Warning</span> {item.label}
                        {item.display ? ` — ${item.display}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </WorkspaceSection>

            <WorkspaceSection title="Trạng thái" description="Trạng thái lưu cục bộ của bài viết.">
              <select
                className="admin-input"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as BlogPostStatus);
                  markDirty();
                }}
              >
                {BLOG_POST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {BLOG_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <div className="admin-form-actions">
                <AdminLoadingButton
                  variant="primary"
                  pending={saving}
                  pendingLabel="Đang lưu bài viết…"
                  onClick={() => void save()}
                >
                  {isEdit ? "Lưu" : "Tạo bài viết"}
                </AdminLoadingButton>
              </div>
            </WorkspaceSection>

            {isEdit && initial && (
              <BlogPublishPanel
                post={initial}
                readiness={readiness}
                readinessLoading={readinessLoading}
                onReadinessRefresh={refreshReadiness}
              />
            )}
          </WorkspaceTabPanel>

          <WorkspaceTabPanel id="ai" active={activeTab === "ai"}>
            <div ref={factorySectionRef} className="blog-ai-zone">
              <p className="blog-ai-zone__notice">
                Khu vực AI hỗ trợ. Mọi đề xuất ở đây là tùy chọn — nội dung cuối cùng do biên tập viên quyết định.
              </p>
              <WorkspaceSection title="Generate" description="AI Content Factory tạo bản nháp từ Knowledge Base." tone="ai">
                <AiContentFactory
                  categories={categories}
                  onApplyArticle={applyAiArticle}
                  onApplySeo={applyAiSeo}
                  onApplyFaq={applyAiFaq}
                  onApplyTags={applyAiTags}
                  onRecommendationsChange={setAiRecommendations}
                  onMessage={(text, type) => setMessage({ text, type })}
                  onScrollToEditor={() => {
                    setActiveTab("editor");
                    editorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  handoff={clusterHandoff}
                  onHandoffConsumed={() => setClusterHandoff(null)}
                />
              </WorkspaceSection>

              <WorkspaceSection title="Cluster" description="Sinh cụm nội dung liên quan." tone="ai">
                <BlogClusterGenerator
                  onCreateArticle={handleClusterCreateArticle}
                  onMessage={(text, type) => setMessage({ text, type })}
                />
              </WorkspaceSection>

              <WorkspaceSection title="Suggestions" description="Đánh giá nhanh mức độ hoàn thiện theo AI." tone="ai">
                <BlogAiReadinessPanel
                  content={markdown}
                  faqJson={faqJson}
                  tags={tags}
                  metaTitle={metaTitle}
                  metaDescription={metaDescription}
                />
              </WorkspaceSection>
            </div>
          </WorkspaceTabPanel>

          {isEdit && initial && (
            <WorkspaceTabPanel id="traceability" active={activeTab === "traceability"}>
              <WorkspaceSection title="Chuỗi nội dung" description="Draft → Review → Handoff → Blog → Publish.">
                <BlogTraceabilityTimeline post={initial} />
              </WorkspaceSection>

              <WorkspaceSection title="Chi tiết nguồn" description="Thông tin truy vết read-only.">
                <ul className="blog-trace-list">
                  <li>
                    Writing Draft: {initial.sourceWritingDraftId ?? "—"}
                    {initial.sourceWritingDraftVersion != null ? ` · v${initial.sourceWritingDraftVersion}` : ""}
                  </li>
                  <li>
                    Review:{" "}
                    {initial.sourceReviewSessionId ? (
                      <Link href={`/admin/content/reviews/${initial.sourceReviewSessionId}`}>
                        {initial.sourceReviewSessionId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </li>
                  <li>Handoff: {initial.sourceHandoffRecordId ?? "—"}</li>
                  <li>Media Bundle: {initial.mediaBundleId ?? "—"}</li>
                  <li>Last handoff: {initial.lastHandoffAt ? formatUpdatedAt(initial.lastHandoffAt) : "—"}</li>
                  {initial.contentModifiedAfterHandoff && (
                    <li className="is-warning">
                      Nội dung đã chỉnh sau handoff — không auto-sync từ Writing Draft mới.
                    </li>
                  )}
                </ul>
              </WorkspaceSection>
            </WorkspaceTabPanel>
          )}
        </div>

        <aside className="blog-workspace-sidebar">
          <BlogReadinessSidebar
            readiness={readiness}
            loading={readinessLoading}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            slug={slug}
            onOpenSeo={() => setActiveTab("seo")}
            onOpenPublishing={() => setActiveTab("publishing")}
            onRefresh={isEdit ? () => void refreshReadiness() : undefined}
          />
        </aside>
      </div>
    </div>
  );
}
