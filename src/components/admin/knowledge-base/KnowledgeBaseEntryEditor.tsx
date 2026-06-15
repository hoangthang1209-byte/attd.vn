"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import type { KnowledgeBaseEntryType, KnowledgeBaseEntryStatus, KnowledgeBasePriority } from "@prisma/client";
import {
  ENTRY_TYPE_OPTIONS,
  generateKnowledgeBaseSlug,
  getEntryStatusLabel,
  getEntryTypeLabel,
  getPriorityLabel,
} from "@/features/knowledge-base/knowledge-base-utils";
import type { KnowledgeBaseTemplate } from "@/features/knowledge-base/knowledge-base-templates";
import KnowledgeBaseUsageScopePicker from "@/components/admin/knowledge-base/KnowledgeBaseUsageScopePicker";
import KnowledgeBaseDetailForm from "@/components/admin/knowledge-base/KnowledgeBaseDetailForm";
import KnowledgeBaseRelatedItemsPicker from "@/components/admin/knowledge-base/KnowledgeBaseRelatedItemsPicker";
import KnowledgeBaseVerificationPanel from "@/components/admin/knowledge-base/KnowledgeBaseVerificationPanel";
import KnowledgeBaseCompletenessPanel from "@/components/admin/knowledge-base/KnowledgeBaseCompletenessPanel";
import KnowledgeBaseTemplatesPicker from "@/components/admin/knowledge-base/KnowledgeBaseTemplatesPicker";
import KnowledgeBaseEditorNav from "@/components/admin/knowledge-base/KnowledgeBaseEditorNav";

type Category = { id: string; name: string; slug: string };

type Props =
  | { mode: "create" }
  | { mode: "edit"; entry: KnowledgeBaseEntryRecord };

type EditorState = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  categoryId: string;
  type: KnowledgeBaseEntryType;
  status: KnowledgeBaseEntryStatus;
  priority: KnowledgeBasePriority;
  tags: string;
  usageScope: string[];
  structuredData: Record<string, unknown> | null;
  relatedProductIds: string[];
  relatedLandingPageSlugs: string[];
  relatedBlogPostIds: string[];
  isVerified: boolean;
};

function buildState(initial: KnowledgeBaseEntryRecord | null, mode: Props["mode"]): EditorState {
  return {
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    summary: initial?.summary ?? "",
    content: initial?.content ?? "",
    categoryId: initial?.categoryId ?? "",
    type: initial?.type ?? "COMPANY",
    status: initial?.status ?? "DRAFT",
    priority: initial?.priority ?? "MEDIUM",
    tags: (initial?.tags ?? []).join(", "),
    usageScope: initial?.usageScope ?? [],
    structuredData: initial?.structuredData ?? null,
    relatedProductIds: initial?.relatedProductIds ?? [],
    relatedLandingPageSlugs: initial?.relatedLandingPageSlugs ?? [],
    relatedBlogPostIds: initial?.relatedBlogPostIds ?? [],
    isVerified: initial?.isVerified ?? false,
  };
}

export default function KnowledgeBaseEntryEditor(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.entry : null;
  const [categories, setCategories] = useState<Category[]>([]);
  const [slugEdited, setSlugEdited] = useState(props.mode === "edit");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(buildState(initial, props.mode)));
  const [state, setState] = useState<EditorState>(() => buildState(initial, props.mode));
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => JSON.stringify(state) !== savedSnapshot, [state, savedSnapshot]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    void fetch("/api/admin/knowledge-base/categories")
      .then((res) => res.json())
      .then((data) => {
        const cats = Array.isArray(data.categories) ? data.categories : [];
        setCategories(cats);
        if (!state.categoryId && cats[0]) {
          setState((prev) => ({ ...prev, categoryId: cats[0].id }));
        }
      });
  }, [state.categoryId]);

  const tagList = useMemo(
    () => state.tags.split(",").map((t) => t.trim()).filter(Boolean),
    [state.tags]
  );

  const update = useCallback(<K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function persist(): Promise<boolean> {
    setSaving(true);
    setMessage(null);
    const payload = {
      title: state.title,
      slug: state.slug || generateKnowledgeBaseSlug(state.title),
      summary: state.summary,
      content: state.content,
      categoryId: state.categoryId,
      type: state.type,
      status: state.status,
      priority: state.priority,
      tags: tagList,
      usageScope: state.usageScope,
      structuredData: state.structuredData,
      relatedProductIds: state.relatedProductIds,
      relatedLandingPageSlugs: state.relatedLandingPageSlugs,
      relatedBlogPostIds: state.relatedBlogPostIds,
      isVerified: state.isVerified,
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
      setSavedSnapshot(JSON.stringify(state));
      if (props.mode === "create" && data.entry?.id) {
        router.push(`/admin/knowledge-base/${data.entry.id}`);
      }
      return true;
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Lưu thất bại",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(): Promise<boolean> {
    return persist();
  }

  async function handleSaveAndBack() {
    const ok = await persist();
    if (ok) router.push("/admin/knowledge-base");
  }

  function applyTemplate(template: KnowledgeBaseTemplate) {
    if (isDirty && !window.confirm("Áp dụng mẫu sẽ thay thế nội dung hiện tại. Tiếp tục?")) {
      return;
    }
    setState((prev) => ({
      ...prev,
      type: template.type,
      title: prev.title || template.titlePlaceholder,
      summary: prev.summary || template.summaryPlaceholder,
      content: prev.content || template.contentPlaceholder,
      tags: template.suggestedTags.join(", "),
      usageScope: template.usageScope,
      structuredData: template.structuredData,
    }));
  }

  return (
    <div className="admin-kb-editor">
      <KnowledgeBaseEditorNav
        saving={saving}
        isDirty={isDirty}
        onSave={handleSave}
        onSaveAndBack={handleSaveAndBack}
      />

      {message && (
        <p className={message.type === "success" ? "admin-success" : "admin-error"}>{message.text}</p>
      )}

      {props.mode === "create" && (
        <KnowledgeBaseTemplatesPicker onApply={applyTemplate} />
      )}

      <div className="admin-form-grid">
        <div className="admin-form-main">
          <div className="admin-field">
            <label className="admin-label">Tiêu đề</label>
            <input
              className="admin-input"
              value={state.title}
              placeholder="Nhập tiêu đề dữ liệu doanh nghiệp"
              onChange={(e) => {
                update("title", e.target.value);
                if (!slugEdited) update("slug", generateKnowledgeBaseSlug(e.target.value));
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input
              className="admin-input"
              value={state.slug}
              onChange={(e) => {
                setSlugEdited(true);
                update("slug", e.target.value);
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Tóm tắt</label>
            <textarea
              className="admin-textarea"
              rows={3}
              value={state.summary}
              onChange={(e) => update("summary", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Nội dung</label>
            <textarea
              className="admin-textarea"
              rows={10}
              value={state.content}
              onChange={(e) => update("content", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Dữ liệu chi tiết</label>
            <p className="admin-field-hint">Điền thông tin cụ thể theo loại dữ liệu — không cần nhập JSON.</p>
            <KnowledgeBaseDetailForm
              type={state.type}
              title={state.title}
              summary={state.summary}
              content={state.content}
              value={state.structuredData}
              onChange={(value) => update("structuredData", value)}
            />
          </div>
        </div>

        <aside className="admin-form-sidebar">
          <KnowledgeBaseCompletenessPanel
            title={state.title}
            summary={state.summary}
            content={state.content}
            categoryId={state.categoryId}
            tags={tagList}
            type={state.type}
            structuredData={state.structuredData}
            isVerified={state.isVerified}
          />

          <div className="admin-field">
            <label className="admin-label">Danh mục</label>
            <select
              className="admin-input"
              value={state.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại</label>
            <select
              className="admin-input"
              value={state.type}
              onChange={(e) => update("type", e.target.value as KnowledgeBaseEntryType)}
            >
              {ENTRY_TYPE_OPTIONS.map((entryType) => (
                <option key={entryType} value={entryType}>{getEntryTypeLabel(entryType)}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select
              className="admin-input"
              value={state.status}
              onChange={(e) => update("status", e.target.value as KnowledgeBaseEntryStatus)}
            >
              {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((s) => (
                <option key={s} value={s}>{getEntryStatusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Ưu tiên</label>
            <select
              className="admin-input"
              value={state.priority}
              onChange={(e) => update("priority", e.target.value as KnowledgeBasePriority)}
            >
              {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                <option key={p} value={p}>{getPriorityLabel(p)}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tags</label>
            <input
              className="admin-input"
              value={state.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="tag1, tag2"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Mục đích sử dụng</label>
            <KnowledgeBaseUsageScopePicker
              value={state.usageScope}
              onChange={(value) => update("usageScope", value)}
            />
          </div>
          <KnowledgeBaseVerificationPanel
            isVerified={state.isVerified}
            verifiedAt={initial?.verifiedAt ?? null}
            onChange={(value) => update("isVerified", value)}
          />
        </aside>
      </div>

      <div className="admin-kb-related-section">
        <h3 className="admin-subtitle">Liên kết nội dung</h3>
        <KnowledgeBaseRelatedItemsPicker
          relatedProductIds={state.relatedProductIds}
          relatedLandingPageSlugs={state.relatedLandingPageSlugs}
          relatedBlogPostIds={state.relatedBlogPostIds}
          onChange={(related) => {
            setState((prev) => ({
              ...prev,
              relatedProductIds: related.relatedProductIds,
              relatedLandingPageSlugs: related.relatedLandingPageSlugs,
              relatedBlogPostIds: related.relatedBlogPostIds,
            }));
          }}
        />
      </div>

      <KnowledgeBaseEditorNav
        saving={saving}
        isDirty={isDirty}
        onSave={handleSave}
        onSaveAndBack={handleSaveAndBack}
      />
    </div>
  );
}
