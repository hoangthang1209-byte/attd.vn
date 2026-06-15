"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import type { KnowledgeBaseEntryType, KnowledgeBaseEntryStatus, KnowledgeBasePriority } from "@prisma/client";
import { generateKnowledgeBaseSlug } from "@/features/knowledge-base/knowledge-base-utils";
import KnowledgeBaseUsageScopePicker from "@/components/admin/knowledge-base/KnowledgeBaseUsageScopePicker";
import KnowledgeBaseStructuredDataEditor from "@/components/admin/knowledge-base/KnowledgeBaseStructuredDataEditor";
import KnowledgeBaseRelatedItemsPicker from "@/components/admin/knowledge-base/KnowledgeBaseRelatedItemsPicker";
import KnowledgeBaseVerificationPanel from "@/components/admin/knowledge-base/KnowledgeBaseVerificationPanel";

type Category = { id: string; name: string; slug: string };

type Props =
  | { mode: "create" }
  | { mode: "edit"; entry: KnowledgeBaseEntryRecord };

const ENTRY_TYPES: KnowledgeBaseEntryType[] = [
  "COMPANY", "PRODUCT", "MATERIAL", "MANUFACTURING", "OEM", "WHOLESALE", "DEALER",
  "PRICING", "POLICY", "CASE_STUDY", "FAQ", "SALES_SCRIPT", "SEO_CONTEXT", "BRAND_VOICE",
  "LOGISTICS", "QUALITY_CONTROL", "CUSTOMER_SEGMENT", "COMPETITOR_NOTE",
];

export default function KnowledgeBaseEntryEditor(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.entry : null;
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(props.mode === "edit");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [type, setType] = useState<KnowledgeBaseEntryType>(initial?.type ?? "COMPANY");
  const [status, setStatus] = useState<KnowledgeBaseEntryStatus>(initial?.status ?? "DRAFT");
  const [priority, setPriority] = useState<KnowledgeBasePriority>(initial?.priority ?? "MEDIUM");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [usageScope, setUsageScope] = useState<string[]>(initial?.usageScope ?? []);
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(
    initial?.structuredData ?? null
  );
  const [related, setRelated] = useState({
    relatedProductIds: initial?.relatedProductIds ?? [],
    relatedLandingPageSlugs: initial?.relatedLandingPageSlugs ?? [],
    relatedBlogPostIds: initial?.relatedBlogPostIds ?? [],
  });
  const [isVerified, setIsVerified] = useState(initial?.isVerified ?? false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/categories")
      .then((res) => res.json())
      .then((data) => {
        const cats = Array.isArray(data.categories) ? data.categories : [];
        setCategories(cats);
        if (!categoryId && cats[0]) setCategoryId(cats[0].id);
      });
  }, [categoryId]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const payload = {
      title,
      slug: slug || generateKnowledgeBaseSlug(title),
      summary,
      content,
      categoryId,
      type,
      status,
      priority,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      usageScope,
      structuredData,
      ...related,
      isVerified,
    };

    const url =
      props.mode === "edit"
        ? `/api/admin/knowledge-base/${props.entry.id}`
        : "/api/admin/knowledge-base";
    const method = props.mode === "edit" ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Lưu thất bại");
      setMessage({ type: "success", text: "Đã lưu dữ liệu doanh nghiệp." });
      if (props.mode === "create" && data.entry?.id) {
        router.push(`/admin/knowledge-base/${data.entry.id}`);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Lưu thất bại",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-kb-editor">
      {message && (
        <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>
      )}

      <div className="admin-form-grid">
        <div className="admin-form-main">
          <div className="admin-field">
            <label className="admin-label">Tiêu đề</label>
            <input
              className="admin-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(generateKnowledgeBaseSlug(e.target.value));
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input
              className="admin-input"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Tóm tắt</label>
            <textarea className="admin-textarea" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Nội dung</label>
            <textarea className="admin-textarea" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Dữ liệu chi tiết</label>
            <KnowledgeBaseStructuredDataEditor value={structuredData} onChange={setStructuredData} />
          </div>
        </div>

        <aside className="admin-form-sidebar">
          <div className="admin-field">
            <label className="admin-label">Danh mục</label>
            <select className="admin-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại</label>
            <select className="admin-input" value={type} onChange={(e) => setType(e.target.value as KnowledgeBaseEntryType)}>
              {ENTRY_TYPES.map((entryType) => (
                <option key={entryType} value={entryType}>{entryType}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as KnowledgeBaseEntryStatus)}>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang dùng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Ưu tiên</label>
            <select className="admin-input" value={priority} onChange={(e) => setPriority(e.target.value as KnowledgeBasePriority)}>
              <option value="HIGH">Cao</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="LOW">Thấp</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tags</label>
            <input className="admin-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Phạm vi sử dụng</label>
            <KnowledgeBaseUsageScopePicker value={usageScope} onChange={setUsageScope} />
          </div>
          <KnowledgeBaseVerificationPanel
            isVerified={isVerified}
            verifiedAt={initial?.verifiedAt ?? null}
            onChange={setIsVerified}
          />
          <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </aside>
      </div>

      <div className="admin-kb-related-section">
        <h3 className="admin-subtitle">Liên kết nội dung</h3>
        <KnowledgeBaseRelatedItemsPicker
          relatedProductIds={related.relatedProductIds}
          relatedLandingPageSlugs={related.relatedLandingPageSlugs}
          relatedBlogPostIds={related.relatedBlogPostIds}
          onChange={setRelated}
        />
      </div>
    </div>
  );
}
