"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaBundleSlotType } from "@prisma/client";
import ContentMediaPicker, {
  type MediaAssetSuggestion,
} from "@/components/admin/media/ContentMediaPicker";
import MediaSuggestionPanel from "@/components/admin/media/MediaSuggestionPanel";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  BLOG_FEATURED_PRESET,
  BLOG_INLINE_PRESET,
  BLOG_OG_PRESET,
  blogDiscoveryPresetForPlacement,
} from "@/features/content/blog-media-presets";
import { buildBlogInlineFigureHtml } from "@/features/content/blog-media-readiness";
import type { BlogMediaReadiness } from "@/features/content/blog-media-readiness";
import {
  MEDIA_BUNDLE_SLOT_TYPE_LABELS,
} from "@/features/media/media-bundle-presets";
import type {
  MediaBundleDetail,
  MediaBundleHealthStatus,
  MediaBundleListItem,
} from "@/features/media/services/media-bundle.service";

type BlogMediaWorkspaceProps = {
  postId: string | null;
  title: string;
  keywords?: string[];
  categoryNames?: string[];
  featuredImageUrl: string | null;
  ogImageUrl: string | null;
  onFeaturedUrlChange: (url: string | null) => void;
  onOgUrlChange: (url: string | null) => void;
  onInsertInlineHtml?: (html: string) => void;
};

type BlogMediaPlacement = "FEATURED" | "OG_IMAGE" | "INLINE" | "COVER";

type AssignmentRow = {
  id: string;
  placement: BlogMediaPlacement | string;
  sortOrder: number;
  slotKey: string | null;
  altTextOverride: string | null;
  captionOverride: string | null;
  mediaAsset: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    title: string | null;
    altText: string | null;
    caption: string | null;
    seoScore: number;
    visibility: string;
  } | null;
};

type WorkspaceData = {
  bundle: MediaBundleDetail | null;
  assignments: AssignmentRow[];
  readiness: BlogMediaReadiness;
  post: {
    id: string;
    title: string;
    status: string;
    featuredImageUrl: string | null;
    ogImageUrl: string | null;
    mediaBundleId: string | null;
  };
};

type PlanSlot = {
  slotType: MediaBundleSlotType;
  label: string;
  required: boolean;
  recommended: boolean;
  minAssets: number;
  foundCount: number;
  status: "MISSING" | "LOW" | "ENOUGH" | "STRONG";
};

type PlanResult = {
  overallScore: number;
  overallStatus: "CRITICAL" | "INSUFFICIENT" | "BASIC" | "GOOD" | "STRONG";
  slots: PlanSlot[];
  recommendations: string[];
};

const HEALTH_LABELS: Record<MediaBundleHealthStatus, string> = {
  INCOMPLETE: "Chưa đủ",
  BASIC: "Cơ bản",
  READY: "Sẵn sàng",
  EXCELLENT: "Xuất sắc",
};

const PLAN_STATUS_LABELS: Record<PlanSlot["status"], string> = {
  MISSING: "Thiếu",
  LOW: "Còn thiếu",
  ENOUGH: "Đủ",
  STRONG: "Dư dùng",
};

const PLAN_OVERALL_LABELS: Record<PlanResult["overallStatus"], string> = {
  CRITICAL: "Nghiêm trọng",
  INSUFFICIENT: "Chưa đủ",
  BASIC: "Cơ bản",
  GOOD: "Tốt",
  STRONG: "Mạnh",
};

const PLACEMENT_LABELS: Record<string, string> = {
  FEATURED: "Featured",
  OG_IMAGE: "OG",
  INLINE: "Nội dung",
};

function healthBadgeStyle(status: MediaBundleHealthStatus): React.CSSProperties {
  switch (status) {
    case "EXCELLENT":
      return { background: "#dcfce7", color: "#166534" };
    case "READY":
      return { background: "#dbeafe", color: "#1e40af" };
    case "BASIC":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#fee2e2", color: "#991b1b" };
  }
}

function planSlotStyle(status: PlanSlot["status"]): React.CSSProperties {
  switch (status) {
    case "STRONG":
      return { background: "#dcfce7", color: "#166534" };
    case "ENOUGH":
      return { background: "#dbeafe", color: "#1e40af" };
    case "LOW":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#fee2e2", color: "#991b1b" };
  }
}

export default function BlogMediaWorkspace({
  postId,
  title,
  keywords = [],
  categoryNames = [],
  featuredImageUrl,
  ogImageUrl,
  onFeaturedUrlChange,
  onOgUrlChange,
  onInsertInlineHtml,
}: BlogMediaWorkspaceProps) {
  const toast = useAdminToast();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [bundles, setBundles] = useState<MediaBundleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bundleListLoading, setBundleListLoading] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [keepBundleLink, setKeepBundleLink] = useState(true);
  const [pickerPlacement, setPickerPlacement] = useState<BlogMediaPlacement | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const discoveryQuery = useMemo(
    () => [title, ...keywords, ...categoryNames].filter(Boolean).join(" ").trim(),
    [title, keywords, categoryNames],
  );

  const inlineAssignments = useMemo(
    () =>
      (workspace?.assignments ?? [])
        .filter((row) => row.placement === "INLINE" && row.mediaAsset)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [workspace?.assignments],
  );

  const featuredAssignment = workspace?.assignments.find((a) => a.placement === "FEATURED");
  const ogAssignment = workspace?.assignments.find((a) => a.placement === "OG_IMAGE");

  const applyWorkspace = useCallback(
    (data: WorkspaceData) => {
      setWorkspace(data);
      onFeaturedUrlChange(data.post.featuredImageUrl);
      onOgUrlChange(data.post.ogImageUrl);
    },
    [onFeaturedUrlChange, onOgUrlChange],
  );

  const loadWorkspace = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/media`);
      const data = (await res.json()) as WorkspaceData & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải media bài viết");
      applyWorkspace(data);
      setSelectedBundleId(data.post.mediaBundleId ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải media bài viết");
    } finally {
      setLoading(false);
    }
  }, [postId, applyWorkspace, toast]);

  const loadBundles = useCallback(async () => {
    setBundleListLoading(true);
    try {
      const params = new URLSearchParams({ contentType: "BLOG_ARTICLE", activeOnly: "1" });
      const res = await fetch(`/api/content/media-bundles?${params.toString()}`);
      const data = (await res.json()) as { bundles?: MediaBundleListItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách Bundle");
      setBundles(data.bundles ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải danh sách Bundle");
      setBundles([]);
    } finally {
      setBundleListLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (postId) void loadWorkspace();
    else setWorkspace(null);
  }, [postId, loadWorkspace]);

  useEffect(() => {
    if (postId) void loadBundles();
  }, [postId, loadBundles]);

  async function patchWorkspace(body: Record<string, unknown>) {
    if (!postId) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as WorkspaceData & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật media");
      applyWorkspace(data);
      toast.success("Đã cập nhật media.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật media");
    } finally {
      setMutating(false);
    }
  }

  async function handleLinkBundle() {
    if (!postId || !selectedBundleId) {
      toast.error("Chọn Bundle trước khi liên kết.");
      return;
    }
    await patchWorkspace({ action: "set-bundle", mediaBundleId: selectedBundleId });
  }

  async function handleImportFromBundle() {
    if (!postId || !selectedBundleId) {
      toast.error("Chọn Bundle trước khi nhập.");
      return;
    }
    const hasExisting = Boolean(
      workspace?.assignments.length || featuredImageUrl || ogImageUrl,
    );
    if (hasExisting) {
      const proceed = window.confirm(
        "Nhập từ Bundle có thể thay thế gán media hiện tại. Tiếp tục?",
      );
      if (!proceed) return;
    }
    setMutating(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/media/from-bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaBundleId: selectedBundleId,
          keepBundleLink,
          replaceExisting: hasExisting,
        }),
      });
      const data = (await res.json()) as WorkspaceData & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể nhập từ Bundle");
      applyWorkspace(data);
      toast.success("Đã nhập media từ Bundle.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể nhập từ Bundle");
    } finally {
      setMutating(false);
    }
  }

  async function handleAssign(asset: MediaAssetSuggestion, placement: BlogMediaPlacement) {
    if (!postId) return;
    const existing =
      placement === "FEATURED"
        ? featuredAssignment
        : placement === "OG_IMAGE"
          ? ogAssignment
          : null;
    if (existing && (placement === "FEATURED" || placement === "OG_IMAGE")) {
      const proceed = window.confirm(`Thay thế ảnh ${PLACEMENT_LABELS[placement]} hiện tại?`);
      if (!proceed) return;
    }
    await patchWorkspace({
      action: "assign",
      mediaAssetId: asset.id,
      placement,
      replaceExisting: Boolean(existing),
    });
    setPickerPlacement(null);
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!postId) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/media/${assignmentId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as WorkspaceData & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể xóa gán media");
      applyWorkspace(data);
      toast.success("Đã xóa gán media.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa gán media");
    } finally {
      setMutating(false);
    }
  }

  async function handleReorderInline(assignmentId: string, direction: "up" | "down") {
    if (!postId) return;
    const ids = inlineAssignments.map((row) => row.id);
    const index = ids.indexOf(assignmentId);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ids.length) return;
    const next = [...ids];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setMutating(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/media/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placement: "INLINE", orderedAssignmentIds: next }),
      });
      const data = (await res.json()) as WorkspaceData & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể sắp xếp media");
      applyWorkspace(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể sắp xếp media");
    } finally {
      setMutating(false);
    }
  }

  function handleInsertInline(row: AssignmentRow) {
    if (!row.mediaAsset || !onInsertInlineHtml) return;
    const html = buildBlogInlineFigureHtml({
      mediaAssetId: row.mediaAsset.id,
      url: row.mediaAsset.url,
      altText: row.altTextOverride ?? row.mediaAsset.altText,
      caption: row.captionOverride ?? row.mediaAsset.caption,
    });
    onInsertInlineHtml(html);
    toast.success("Đã chèn ảnh vào nội dung.");
  }

  async function handleCoverageCheck() {
    setPlanLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/content/media/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "BLOG_ARTICLE",
          query: title.trim() || undefined,
          subjectTerms: [...keywords, ...categoryNames].filter(Boolean),
        }),
      });
      const data = (await res.json()) as { plan?: PlanResult; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể kiểm tra độ phủ");
      setPlan(data.plan ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể kiểm tra độ phủ");
    } finally {
      setPlanLoading(false);
    }
  }

  function renderPlacementCard(
    placement: "FEATURED" | "OG_IMAGE",
    assignment: AssignmentRow | undefined,
    legacyUrl: string | null,
  ) {
    const asset = assignment?.mediaAsset;
    const previewUrl = asset?.thumbnailUrl ?? asset?.url ?? legacyUrl;
    const preset = placement === "FEATURED" ? BLOG_FEATURED_PRESET : BLOG_OG_PRESET;

    return (
      <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
        <div className="admin-field-header-row">
          <h4 className="admin-subtitle" style={{ margin: 0 }}>
            {PLACEMENT_LABELS[placement]}
          </h4>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              disabled={mutating}
              onClick={() => setPickerPlacement(placement)}
            >
              Chọn
            </button>
            {assignment && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                disabled={mutating}
                onClick={() => void handleRemoveAssignment(assignment.id)}
              >
                Xóa
              </button>
            )}
          </div>
        </div>
        {previewUrl ? (
          <div className="admin-media-preview" style={{ maxWidth: 200, marginTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={asset?.altText ?? PLACEMENT_LABELS[placement]} />
          </div>
        ) : (
          <p className="admin-field-hint">Chưa gán ảnh {PLACEMENT_LABELS[placement]}.</p>
        )}
        {asset && typeof asset.seoScore === "number" && (
          <p className="admin-field-hint">SEO {asset.seoScore}</p>
        )}
        <p className="admin-field-hint" style={{ marginTop: 4 }}>
          Gợi ý: {preset.contentSuitabilities.join(", ")}
        </p>
      </div>
    );
  }

  return (
    <details className="admin-sidebar-card" open style={{ marginTop: 16 }}>
      <summary className="admin-sidebar-title" style={{ cursor: "pointer" }}>
        Hình ảnh nội dung
      </summary>

      {!postId ? (
        <div style={{ marginTop: 12 }}>
          <p className="admin-field-hint">
            Lưu bản nháp để quản lý hình ảnh nâng cao.
          </p>
          <p className="admin-field-hint">
            Ảnh Featured và OG vẫn có thể chọn ở sidebar bên phải.
          </p>
        </div>
      ) : loading ? (
        <InlineLoading title="Đang tải workspace media…" tone="admin" />
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 1. Media Bundle */}
          <section>
            <h4 className="admin-subtitle">Media Bundle</h4>
            {workspace?.bundle ? (
              <div style={{ marginBottom: 8 }}>
                <p className="admin-field-hint">
                  Đang liên kết:{" "}
                  <Link href={`/admin/content/media-bundles/${workspace.bundle.id}`} className="admin-link">
                    {workspace.bundle.name}
                  </Link>
                </p>
                <span className="admin-badge" style={healthBadgeStyle(workspace.bundle.health.status)}>
                  {HEALTH_LABELS[workspace.bundle.health.status]} ({workspace.bundle.health.score}/100)
                </span>
              </div>
            ) : (
              <p className="admin-field-hint">Chưa liên kết Bundle.</p>
            )}

            {bundleListLoading ? (
              <InlineLoading title="Đang tải Bundle…" tone="admin" />
            ) : (
              <select
                className="admin-input"
                value={selectedBundleId}
                onChange={(e) => setSelectedBundleId(e.target.value)}
                style={{ marginBottom: 8 }}
              >
                <option value="">— Chọn Bundle —</option>
                {bundles.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} ({HEALTH_LABELS[row.health.status]} {row.health.score})
                  </option>
                ))}
              </select>
            )}

            <div className="admin-toolbar" style={{ flexWrap: "wrap" }}>
              <AdminLoadingButton
                variant="secondary"
                pending={mutating}
                pendingLabel="Đang liên kết…"
                onClick={() => void handleLinkBundle()}
              >
                Liên kết Bundle
              </AdminLoadingButton>
              <AdminLoadingButton
                variant="secondary"
                pending={mutating}
                pendingLabel="Đang nhập…"
                onClick={() => void handleImportFromBundle()}
              >
                Nhập từ Bundle
              </AdminLoadingButton>
            </div>
            <label className="admin-checkbox-item" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={keepBundleLink}
                onChange={(e) => setKeepBundleLink(e.target.checked)}
              />
              <span>Giữ liên kết với Bundle</span>
            </label>
          </section>

          {/* 2. Featured / OG */}
          <section>
            <h4 className="admin-subtitle">Ảnh đại diện & OG</h4>
            {workspace?.readiness && (
              <p className="admin-field-hint" style={{ marginBottom: 8 }}>
                Độ sẵn sàng media: {workspace.readiness.score}/100
                {workspace.readiness.warnings.length > 0 &&
                  ` · ${workspace.readiness.warnings[0]}`}
              </p>
            )}
            <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {renderPlacementCard("FEATURED", featuredAssignment, featuredImageUrl)}
              {renderPlacementCard("OG_IMAGE", ogAssignment, ogImageUrl)}
            </div>
          </section>

          {/* 3. Inline tray */}
          <section>
            <div className="admin-field-header-row">
              <h4 className="admin-subtitle" style={{ margin: 0 }}>
                Ảnh nội dung (inline)
              </h4>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                disabled={mutating}
                onClick={() => setPickerPlacement("INLINE")}
              >
                Thêm ảnh
              </button>
            </div>
            {inlineAssignments.length === 0 ? (
              <p className="admin-field-hint">Chưa có ảnh inline.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                {inlineAssignments.map((row, index) => {
                  const asset = row.mediaAsset!;
                  return (
                    <li
                      key={row.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--admin-border, #e5e7eb)",
                      }}
                    >
                      <div className="admin-media-preview" style={{ width: 56, height: 56, flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.thumbnailUrl ?? asset.url}
                          alt={asset.altText ?? ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="admin-field-hint" style={{ margin: 0 }}>
                          {row.captionOverride ?? asset.caption ?? asset.title ?? asset.altText ?? "Ảnh inline"}
                        </p>
                        <p className="admin-field-hint">SEO {asset.seoScore}</p>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          disabled={mutating || index === 0}
                          onClick={() => void handleReorderInline(row.id, "up")}
                          title="Lên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          disabled={mutating || index === inlineAssignments.length - 1}
                          onClick={() => void handleReorderInline(row.id, "down")}
                          title="Xuống"
                        >
                          ↓
                        </button>
                        {onInsertInlineHtml && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            onClick={() => handleInsertInline(row)}
                          >
                            Chèn
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          disabled={mutating}
                          onClick={() => void handleRemoveAssignment(row.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 4. Suggestions */}
          <section>
            <h4 className="admin-subtitle">Gợi ý nhanh</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p className="admin-field-hint">Featured / Cover</p>
                <MediaSuggestionPanel
                  query={discoveryQuery}
                  contentSuitabilities={BLOG_FEATURED_PRESET.contentSuitabilities}
                  roles={BLOG_FEATURED_PRESET.roles}
                  orientation={BLOG_FEATURED_PRESET.orientation}
                  minimumSeoScore={BLOG_FEATURED_PRESET.minimumSeoScore}
                  bundleContentType="BLOG_ARTICLE"
                  bundleSlotType="FEATURED"
                  selectedIds={featuredAssignment?.mediaAsset ? [featuredAssignment.mediaAsset.id] : []}
                  onSelect={(asset) => void handleAssign(asset, "FEATURED")}
                />
              </div>
              <div>
                <p className="admin-field-hint">Inline</p>
                <MediaSuggestionPanel
                  query={discoveryQuery}
                  contentSuitabilities={BLOG_INLINE_PRESET.contentSuitabilities}
                  roles={BLOG_INLINE_PRESET.roles}
                  bundleContentType="BLOG_ARTICLE"
                  bundleSlotType="INLINE"
                  selectedIds={inlineAssignments.map((row) => row.mediaAsset!.id)}
                  multiple
                  onSelect={(asset) => void handleAssign(asset, "INLINE")}
                />
              </div>
            </div>
          </section>

          {/* 5. Coverage check */}
          <section>
            <div className="admin-field-header-row">
              <h4 className="admin-subtitle" style={{ margin: 0 }}>
                Kiểm tra độ phủ hình ảnh
              </h4>
              <AdminLoadingButton
                variant="secondary"
                pending={planLoading}
                pendingLabel="Đang kiểm tra…"
                onClick={() => void handleCoverageCheck()}
              >
                Kiểm tra độ phủ hình ảnh
              </AdminLoadingButton>
            </div>
            {plan && (
              <div style={{ marginTop: 8 }}>
                <p className="admin-field-hint">
                  Tổng thể: {PLAN_OVERALL_LABELS[plan.overallStatus]} ({plan.overallScore}/100)
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
                  {plan.slots.map((slot) => (
                    <li
                      key={slot.slotType}
                      style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}
                    >
                      <span className="admin-badge" style={planSlotStyle(slot.status)}>
                        {PLAN_STATUS_LABELS[slot.status]}
                      </span>
                      <span>
                        {slot.label || MEDIA_BUNDLE_SLOT_TYPE_LABELS[slot.slotType]} — {slot.foundCount}/
                        {slot.minAssets}
                      </span>
                    </li>
                  ))}
                </ul>
                {plan.recommendations.length > 0 && (
                  <p className="admin-field-hint">{plan.recommendations[0]}</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {pickerPlacement && postId && (
        <ContentMediaPicker
          entityType="BLOG_POST"
          entityId={postId}
          placement={pickerPlacement}
          query={discoveryQuery}
          bundleId={(workspace?.post.mediaBundleId ?? selectedBundleId) || undefined}
          allowedSuitabilities={blogDiscoveryPresetForPlacement(pickerPlacement).contentSuitabilities}
          selectedAssetIds={
            pickerPlacement === "INLINE"
              ? inlineAssignments.map((row) => row.mediaAsset!.id)
              : pickerPlacement === "FEATURED"
                ? featuredAssignment?.mediaAsset
                  ? [featuredAssignment.mediaAsset.id]
                  : []
                : ogAssignment?.mediaAsset
                  ? [ogAssignment.mediaAsset.id]
                  : []
          }
          onSelect={(assets) => {
            const asset = assets[0];
            if (asset) void handleAssign(asset, pickerPlacement);
          }}
          onClose={() => setPickerPlacement(null)}
        />
      )}
    </details>
  );
}
