"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useRouter } from "next/navigation";
import type {
  MlAsset,
  MlLookups,
} from "@/components/admin/manufacturing-library/ManufacturingLibraryAdminTypes";

type Props = {
  asset?: MlAsset | null;
  lookups: MlLookups;
};

type MediaRow = {
  mediaAssetId: string;
  role: string;
  caption: string;
  altText: string;
  sortOrder: number;
};

type DisplayRow = {
  displayLocationId: string;
  sortOrder: number;
};

type TagRow = {
  name: string;
  slug: string;
};

type RelationRow = {
  targetType: string;
  targetId: string;
  role: string;
  sortOrder: number;
};

type WorkflowRow = {
  workflowId: string;
  role: string;
  sortOrder: number;
};

const MEDIA_ROLES = [
  "THUMBNAIL",
  "HERO",
  "EVIDENCE",
  "GALLERY",
  "PROCESS",
  "TIMELINE",
  "VIDEO",
  "DOCUMENT",
  "PDF",
];

function jsonText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function datetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dedupeTags(rows: TagRow[]): TagRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const slug = slugify(row.slug || row.name);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

export default function ManufacturingAssetEditor({ asset, lookups }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(asset?.title ?? "");
  const [slug, setSlug] = useState(asset?.slug ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const [categoryId, setCategoryId] = useState(asset?.categoryId ?? "");
  const [status, setStatus] = useState(asset?.status ?? "DRAFT");
  const [visibility, setVisibility] = useState(asset?.visibility ?? "INTERNAL");
  const [priority, setPriority] = useState(asset?.priority ?? 0);
  const [featured, setFeatured] = useState(asset?.featured ?? false);
  const [publishedAt, setPublishedAt] = useState(datetimeLocal(asset?.publishedAt));
  const [seoTitle, setSeoTitle] = useState(asset?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(asset?.seoDescription ?? "");
  const [aiSummary, setAiSummary] = useState(asset?.aiSummary ?? "");
  const [aiKeywords, setAiKeywords] = useState(jsonText(asset?.aiKeywords));
  const [metadata, setMetadata] = useState(jsonText(asset?.metadata));
  const [media, setMedia] = useState<MediaRow[]>(
    asset?.media.map((item) => ({
      mediaAssetId: item.mediaAssetId,
      role: item.role,
      caption: item.caption ?? "",
      altText: item.altText ?? "",
      sortOrder: item.sortOrder,
    })) ?? [],
  );
  const [displayRows, setDisplayRows] = useState<DisplayRow[]>(
    asset?.displayLocations.map((item) => ({
      displayLocationId: item.displayLocationId,
      sortOrder: item.sortOrder,
    })) ?? [],
  );
  const [tags, setTags] = useState<TagRow[]>(
    asset?.tags.map(({ tag }) => ({ name: tag.name, slug: tag.slug })) ?? [],
  );
  const [relations, setRelations] = useState<RelationRow[]>(
    asset?.relations.map((item) => ({
      targetType: item.targetType,
      targetId: item.targetId,
      role: item.role ?? "",
      sortOrder: item.sortOrder,
    })) ?? [],
  );
  const [workflows, setWorkflows] = useState<WorkflowRow[]>(
    asset?.workflows.map((item) => ({
      workflowId: item.workflowId,
      role: item.role ?? "",
      sortOrder: item.sortOrder,
    })) ?? [],
  );

  const productOptions = useMemo(
    () =>
      lookups.products.map((product) => ({
        value: product.id,
        label: `${product.name}${product.productCode ? ` (${product.productCode})` : ""}`,
      })),
    [lookups.products],
  );

  function updateMedia(index: number, patch: Partial<MediaRow>) {
    setMedia((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateDisplay(index: number, patch: Partial<DisplayRow>) {
    setDisplayRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateTag(index: number, patch: Partial<TagRow>) {
    setTags((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateRelation(index: number, patch: Partial<RelationRow>) {
    setRelations((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateWorkflow(index: number, patch: Partial<WorkflowRow>) {
    setWorkflows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload = {
      title,
      slug,
      description,
      categoryId: categoryId || null,
      status,
      visibility,
      priority,
      featured,
      publishedAt: publishedAt || null,
      seoTitle,
      seoDescription,
      aiSummary,
      aiKeywords,
      metadata,
      media,
      displayLocations: displayRows,
      tags: dedupeTags(tags),
      relations,
      workflows,
    };
    const url = asset
      ? `/api/admin/manufacturing-library/${asset.id}`
      : "/api/admin/manufacturing-library";
    const res = await fetch(url, {
      method: asset ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }
    setMessage({ type: "success", text: "Đã lưu tài sản sản xuất" });
    const nextId = data.asset?.id ?? asset?.id;
    if (!asset && nextId) router.push(`/admin/manufacturing-library/${nextId}`);
    router.refresh();
  }

  return (
    <form className="admin-panel admin-form admin-form--wide" onSubmit={submit}>
      <div className="admin-panel-header">
        <div>
          <h2>{asset ? "Sửa tài sản sản xuất" : "Tạo tài sản sản xuất"}</h2>
          <p className="admin-field-hint">Dùng MediaAsset có sẵn, không upload trùng.</p>
        </div>
        <div className="admin-panel-actions">
          <Link href="/admin/manufacturing-library" className="admin-link-button">
            Quay lại
          </Link>
          <AdminLoadingButton
            type="submit"
            variant="primary"
            pending={saving}
            pendingLabel="Đang lưu tài sản sản xuất…"
          >
            Lưu
          </AdminLoadingButton>
        </div>
      </div>

      {message ? (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      ) : null}

      <section className="admin-panel">
        <h3>Overview</h3>
        <div className="admin-form-grid">
          <label>
            Title
            <input
              className="admin-input"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!asset && !slug) setSlug(slugify(event.target.value));
              }}
              required
            />
          </label>
          <label>
            Slug
            <input className="admin-input" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </label>
          <label className="admin-form-grid-span-2">
            Mô tả
            <textarea className="admin-input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Danh mục
            <select className="admin-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Chưa chọn</option>
              {lookups.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select className="admin-input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </label>
          <label>
            Phạm vi hiển thị
            <select className="admin-input" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              <option value="PUBLIC">Public</option>
              <option value="DEALER_ONLY">Đại lý</option>
              <option value="CUSTOMER_ONLY">Khách hàng</option>
              <option value="INTERNAL">Nội bộ</option>
            </select>
          </label>
          <label>
            Thứ tự ưu tiên
            <input className="admin-input" type="number" value={priority} onChange={(event) => setPriority(Number(event.target.value))} />
          </label>
          <label>
            Published at
            <input className="admin-input" type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />
          </label>
          <label className="admin-checkbox-row">
            <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
            Nổi bật
          </label>
        </div>
      </section>

      <section className="admin-panel">
        <h3>SEO & AI metadata placeholder</h3>
        <div className="admin-form-grid">
          <label>
            SEO title
            <input className="admin-input" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
          </label>
          <label>
            SEO description
            <input className="admin-input" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} />
          </label>
          <label className="admin-form-grid-span-2">
            AI summary
            <textarea className="admin-input" rows={3} value={aiSummary} onChange={(event) => setAiSummary(event.target.value)} />
          </label>
          <label>
            AI keywords JSON
            <textarea className="admin-input" rows={4} value={aiKeywords} onChange={(event) => setAiKeywords(event.target.value)} placeholder='["qc","packing"]' />
          </label>
          <label>
            Metadata JSON
            <textarea className="admin-input" rows={4} value={metadata} onChange={(event) => setMetadata(event.target.value)} placeholder='{"source":"internal"}' />
          </label>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Media</h3>
          <button type="button" onClick={() => setMedia((rows) => [...rows, { mediaAssetId: "", role: "GALLERY", caption: "", altText: "", sortOrder: rows.length * 10 }])}>
            Thêm media
          </button>
        </div>
        {media.map((row, index) => (
          <div key={`${index}-${row.mediaAssetId}`} className="admin-form-grid">
            <select className="admin-input" value={row.mediaAssetId} onChange={(event) => updateMedia(index, { mediaAssetId: event.target.value })}>
              <option value="">Chọn MediaAsset</option>
              {lookups.mediaAssets.map((mediaAsset) => (
                <option key={mediaAsset.id} value={mediaAsset.id}>
                  {mediaAsset.title || mediaAsset.filename} - {mediaAsset.mimeType}
                </option>
              ))}
            </select>
            <select className="admin-input" value={row.role} onChange={(event) => updateMedia(index, { role: event.target.value })}>
              {MEDIA_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <input className="admin-input" placeholder="Caption" value={row.caption} onChange={(event) => updateMedia(index, { caption: event.target.value })} />
            <input className="admin-input" placeholder="Alt text" value={row.altText} onChange={(event) => updateMedia(index, { altText: event.target.value })} />
            <input className="admin-input" type="number" value={row.sortOrder} onChange={(event) => updateMedia(index, { sortOrder: Number(event.target.value) })} />
            <button type="button" onClick={() => setMedia((rows) => rows.filter((_, i) => i !== index))}>Xóa</button>
          </div>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Vị trí hiển thị</h3>
          <button type="button" onClick={() => setDisplayRows((rows) => [...rows, { displayLocationId: "", sortOrder: rows.length * 10 }])}>
            Thêm vị trí
          </button>
        </div>
        {displayRows.map((row, index) => (
          <div key={`${index}-${row.displayLocationId}`} className="admin-form-grid">
            <select className="admin-input" value={row.displayLocationId} onChange={(event) => updateDisplay(index, { displayLocationId: event.target.value })}>
              <option value="">Chọn vị trí</option>
              {lookups.displayLocations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            <input className="admin-input" type="number" value={row.sortOrder} onChange={(event) => updateDisplay(index, { sortOrder: Number(event.target.value) })} />
            <button type="button" onClick={() => setDisplayRows((rows) => rows.filter((_, i) => i !== index))}>Xóa</button>
          </div>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Thẻ</h3>
          <button type="button" onClick={() => setTags((rows) => [...rows, { name: "", slug: "" }])}>Thêm thẻ</button>
        </div>
        {tags.map((row, index) => (
          <div key={`${index}-${row.slug}`} className="admin-form-grid">
            <input className="admin-input" placeholder="Tên thẻ" value={row.name} onChange={(event) => updateTag(index, { name: event.target.value, slug: row.slug || slugify(event.target.value) })} />
            <input className="admin-input" placeholder="slug" value={row.slug} onChange={(event) => updateTag(index, { slug: event.target.value })} />
            <button type="button" onClick={() => setTags((rows) => rows.filter((_, i) => i !== index))}>Xóa</button>
          </div>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Liên kết</h3>
          <button type="button" onClick={() => setRelations((rows) => [...rows, { targetType: "PRODUCT", targetId: "", role: "", sortOrder: rows.length * 10 }])}>Thêm liên kết</button>
        </div>
        {relations.map((row, index) => (
          <div key={`${index}-${row.targetType}`} className="admin-form-grid">
            <select className="admin-input" value={row.targetType} onChange={(event) => updateRelation(index, { targetType: event.target.value, targetId: "" })}>
              {lookups.relationTargetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {row.targetType === "PRODUCT" ? (
              <select className="admin-input" value={row.targetId} onChange={(event) => updateRelation(index, { targetId: event.target.value })}>
                <option value="">Chọn sản phẩm</option>
                {productOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : row.targetType === "PRODUCT_CATEGORY" ? (
              <select className="admin-input" value={row.targetId} onChange={(event) => updateRelation(index, { targetId: event.target.value })}>
                <option value="">Chọn danh mục sản phẩm</option>
                {lookups.productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            ) : (
              <input className="admin-input" placeholder="targetId" value={row.targetId} onChange={(event) => updateRelation(index, { targetId: event.target.value })} />
            )}
            <input className="admin-input" placeholder="role" value={row.role} onChange={(event) => updateRelation(index, { role: event.target.value })} />
            <input className="admin-input" type="number" value={row.sortOrder} onChange={(event) => updateRelation(index, { sortOrder: Number(event.target.value) })} />
            <button type="button" onClick={() => setRelations((rows) => rows.filter((_, i) => i !== index))}>Xóa</button>
          </div>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Quy trình</h3>
          <button type="button" onClick={() => setWorkflows((rows) => [...rows, { workflowId: "", role: "", sortOrder: rows.length * 10 }])}>Gắn quy trình</button>
        </div>
        {workflows.map((row, index) => (
          <div key={`${index}-${row.workflowId}`} className="admin-form-grid">
            <select className="admin-input" value={row.workflowId} onChange={(event) => updateWorkflow(index, { workflowId: event.target.value })}>
              <option value="">Chọn quy trình</option>
              {lookups.workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}
            </select>
            <input className="admin-input" placeholder="role" value={row.role} onChange={(event) => updateWorkflow(index, { role: event.target.value })} />
            <input className="admin-input" type="number" value={row.sortOrder} onChange={(event) => updateWorkflow(index, { sortOrder: Number(event.target.value) })} />
            <button type="button" onClick={() => setWorkflows((rows) => rows.filter((_, i) => i !== index))}>Xóa</button>
          </div>
        ))}
      </section>
    </form>
  );
}
