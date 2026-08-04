/**
 * Human-facing labels & presentation helpers for Asset Workspace (Sprint 15.0).
 * Pure UI — no API / schema changes.
 */

import type { CSSProperties } from "react";
import type { AssetHealthBreakdown } from "@/features/media/intelligence/intelligence.types";
import type { MediaAssetDependency } from "@/features/media/lifecycle/lifecycle.types";

export type PreviewMode =
  | "desktop"
  | "tablet"
  | "mobile"
  | "square"
  | "landscape"
  | "portrait";

export const PREVIEW_MODES: Array<{ id: PreviewMode; label: string }> = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
  { id: "square", label: "Square" },
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
];

export function previewFrameStyle(mode: PreviewMode): {
  maxWidth: string;
  height: number;
} {
  switch (mode) {
    case "tablet":
      return { maxWidth: "768px", height: 320 };
    case "mobile":
      return { maxWidth: "390px", height: 280 };
    case "square":
      return { maxWidth: "320px", height: 320 };
    case "landscape":
      return { maxWidth: "480px", height: 270 };
    case "portrait":
      return { maxWidth: "270px", height: 400 };
    default:
      return { maxWidth: "100%", height: 360 };
  }
}

export function humanAiStatus(status: string): string {
  switch (status) {
    case "NOT_PROCESSED":
      return "Chưa phân tích";
    case "QUEUED":
      return "Đang xếp hàng";
    case "PROCESSING":
      return "Đang phân tích";
    case "COMPLETED":
      return "Đã phân tích";
    case "FAILED":
      return "Phân tích lỗi";
    case "SKIPPED":
      return "Đã bỏ qua";
    default:
      return status;
  }
}

export function humanSeoReadiness(status: string): string {
  switch (status) {
    case "INCOMPLETE":
      return "Chưa đủ SEO";
    case "BASIC":
      return "SEO cơ bản";
    case "READY":
      return "Sẵn sàng SEO";
    case "EXCELLENT":
      return "SEO xuất sắc";
    default:
      return status;
  }
}

export function humanDuplicate(status: string): string {
  switch (status) {
    case "UNIQUE":
      return "Không trùng";
    case "POSSIBLE_DUPLICATE":
      return "Có thể trùng";
    case "CONFIRMED_DUPLICATE":
      return "Đã xác nhận trùng";
    case "VARIANT":
      return "Biến thể";
    default:
      return status || "—";
  }
}

export function humanLifecycle(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Đang dùng";
    case "REVIEW_REQUIRED":
      return "Cần review";
    case "DEPRECATED":
      return "Không khuyến nghị";
    case "ARCHIVED":
      return "Đã lưu trữ";
    case "RETIRED":
      return "Ngừng dùng";
    default:
      return status;
  }
}

export function humanVisibility(status: string): string {
  switch (status) {
    case "PUBLIC":
      return "Công khai";
    case "INTERNAL":
      return "Nội bộ";
    case "PRIVATE":
      return "Riêng tư";
    default:
      return status;
  }
}

export function humanRights(status: string): string {
  switch (status) {
    case "UNKNOWN":
      return "Chưa rõ quyền";
    case "OWNED":
      return "Sở hữu ATTD";
    case "LICENSED":
      return "Có giấy phép";
    case "RESTRICTED":
      return "Hạn chế";
    case "EXPIRED":
      return "Hết hạn";
    default:
      return status;
  }
}

export function humanModule(type: string): string {
  switch (type) {
    case "PRODUCT":
      return "Sản phẩm";
    case "BLOG":
      return "Blog";
    case "HOMEPAGE":
      return "Trang chủ";
    case "CATEGORY":
      return "Danh mục";
    case "CASE_STUDY":
      return "Dự án";
    case "CONTENT_BUNDLE":
      return "Media Bundle";
    case "QUOTE":
      return "Báo giá";
    case "ORDER":
      return "Đơn hàng";
    case "MANUFACTURING":
      return "Thư viện SX";
    case "TECH_PACK":
      return "Tech pack";
    case "SALES":
      return "Sales";
    default:
      return type;
  }
}

export function humanField(field: string | null | undefined): string {
  if (!field) return "Media";
  const map: Record<string, string> = {
    featuredImage: "Featured",
    gallery: "Gallery",
    "ProductImage.imageUrl": "Gallery image",
    imageUrl: "Ảnh",
    mediaAssetId: "Media asset",
    featuredImageUrl: "Featured",
    ogImageUrl: "Open Graph",
    "content.data-media-id": "Inline",
    INLINE: "Inline",
    FEATURED: "Featured",
    OG_IMAGE: "Open Graph",
    COVER: "Cover",
    HERO: "Hero",
    GALLERY: "Gallery",
    oemMediaAssetId: "OEM Hero",
    descriptionBlocks: "Mô tả sản phẩm",
  };
  if (map[field]) return map[field];
  if (field.startsWith("INLINE")) return "Inline";
  if (field.startsWith("role:")) return field.replace("role:", "Role ");
  return field;
}

export function healthColor(score: number): string {
  if (score >= 80) return "#15803d";
  if (score >= 60) return "#a16207";
  if (score >= 40) return "#c2410c";
  return "#b91c1c";
}

export function healthGradeLabel(grade: AssetHealthBreakdown["grade"]): string {
  switch (grade) {
    case "excellent":
      return "A+";
    case "good":
      return "A";
    case "fair":
      return "B";
    case "poor":
      return "C";
    default:
      return "—";
  }
}

export function qualityStars(seoScore: number): string {
  const filled = Math.max(1, Math.min(5, Math.round(seoScore / 20)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "1 ngày trước";
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

export function timelineIcon(type: string): string {
  switch (type) {
    case "UPLOADED":
      return "↑";
    case "METADATA":
      return "✦";
    case "REVIEWED":
      return "✓";
    case "USED":
      return "◉";
    case "BUNDLE":
      return "▦";
    case "STATUS":
      return "↻";
    case "LIFECYCLE":
      return "⟳";
    case "REPLACEMENT":
      return "⇄";
    default:
      return "•";
  }
}

export function humanLifecycleAction(action: string): string {
  const map: Record<string, string> = {
    TRANSITION: "Lifecycle changed",
    SET_RIGHTS: "Rights updated",
    SELECT_REPLACEMENT: "Replacement selected",
    PLAN_REPLACEMENT: "Replacement planned",
    APPLY_REPLACEMENT: "Replacement completed",
    UPLOADED: "Uploaded",
  };
  return map[action] || action;
}

export type UsageCardModel = {
  key: string;
  moduleLabel: string;
  title: string;
  placement: string;
  statusLabel: string;
  statusTone: "public" | "internal";
  href: string | null;
  updatedHint: string | null;
};

export function toUsageCard(dep: MediaAssetDependency): UsageCardModel {
  return {
    key: `${dep.referenceType}:${dep.referenceId}:${dep.field ?? ""}`,
    moduleLabel: humanModule(dep.referenceType),
    title: dep.referenceLabel || dep.referenceId,
    placement: humanField(dep.field),
    statusLabel: dep.contentStatus
      ? dep.contentStatus
      : dep.publicImpact
        ? "Published / Public"
        : "Internal",
    statusTone: dep.publicImpact ? "public" : "internal",
    href: dep.referenceUrl,
    updatedHint: null,
  };
}

export function buildUsageTree(
  byModule: Record<string, MediaAssetDependency[]>,
): Array<{ module: string; label: string; children: Array<{ id: string; label: string; field: string }> }> {
  return Object.entries(byModule).map(([module, rows]) => ({
    module,
    label: humanModule(module),
    children: rows.map((row) => ({
      id: row.referenceId,
      label: row.referenceLabel || row.referenceId,
      field: humanField(row.field),
    })),
  }));
}

export function humanSimilarRelation(relation: string): string {
  switch (relation) {
    case "DUPLICATE":
      return "Duplicate";
    case "SAME_HASH":
      return "Same file hash";
    case "SAME_PRODUCT":
      return "Same product";
    case "SAME_BUNDLE":
      return "Same bundle";
    case "SAME_ROLE":
      return "Same role";
    case "SIMILAR_TERMS":
      return "Similar";
    default:
      return relation;
  }
}

export function humanHealthIssue(issue: string): string {
  const map: Record<string, string> = {
    missing_alt: "Thiếu alt text",
    missing_caption: "Thiếu caption",
    missing_title: "Thiếu tiêu đề",
    low_resolution: "Độ phân giải thấp",
    possible_duplicate: "Có thể trùng",
    confirmed_duplicate: "Đã xác nhận trùng",
    private_visibility: "Đang Private",
    no_bundle: "Chưa vào bundle",
    weak_suitability: "Thiếu suitability",
    unused: "Chưa được dùng",
  };
  return map[issue] || issue.replace(/_/g, " ");
}

export const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  background: "#fff",
};