/**
 * Human-facing labels & presentation helpers for Asset Workspace (Sprint 15.x).
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

/** Primary IA tabs (Sprint 15.1). */
export type WorkspacePrimaryTab =
  | "overview"
  | "usage"
  | "metadata"
  | "lifecycle"
  | "insights";

export const WORKSPACE_PRIMARY_TABS: Array<{ id: WorkspacePrimaryTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "usage", label: "Usage" },
  { id: "metadata", label: "Metadata" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "insights", label: "Insights" },
];

export function primaryTabShortcutLabel(index: number): string {
  const pos = index + 1;
  if (pos < 1 || pos > WORKSPACE_PRIMARY_TABS.length) return "";
  return `Alt+${pos}`;
}

/** Map legacy deep-links (?section=) and next-action sections → primary tab. */
export function resolvePrimaryTab(raw: string | null | undefined): WorkspacePrimaryTab {
  switch (raw) {
    case "usage":
      return "usage";
    case "metadata":
      return "metadata";
    case "insights":
    case "similar":
      return "insights";
    case "lifecycle":
    case "replacement":
    case "rights":
    case "timeline":
      return "lifecycle";
    case "overview":
    case "health":
    case "ai":
    case "bundles":
    default:
      return "overview";
  }
}

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
      return "Đang sử dụng";
    case "REVIEW_REQUIRED":
      return "Cần xem lại";
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

export function lifecycleChipStyle(status: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  };
  switch (status) {
    case "ACTIVE":
      return { ...base, background: "#dcfce7", color: "#166534" };
    case "REVIEW_REQUIRED":
      return { ...base, background: "#fef3c7", color: "#92400e" };
    case "DEPRECATED":
      return { ...base, background: "#ffedd5", color: "#9a3412" };
    case "ARCHIVED":
      return { ...base, background: "#e5e7eb", color: "#374151" };
    case "RETIRED":
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    default:
      return { ...base, background: "#f3f4f6", color: "#374151" };
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
      return "Product";
    case "BLOG":
      return "Blog";
    case "HOMEPAGE":
      return "Homepage";
    case "CATEGORY":
      return "Landing Page";
    case "CASE_STUDY":
      return "Case Study";
    case "CONTENT_BUNDLE":
      return "Media Bundle";
    case "QUOTE":
      return "Quote";
    case "ORDER":
      return "Order";
    case "MANUFACTURING":
      return "Manufacturing";
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
    imageUrl: "Image",
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
    descriptionBlocks: "Description",
  };
  if (map[field]) return map[field];
  if (field.startsWith("INLINE")) return "Inline";
  if (field.startsWith("role:")) return field.replace("role:", "Role ");
  return field;
}

export function humanContentStatus(
  contentStatus: string | null | undefined,
  publicImpact: boolean,
): { label: string; tone: "published" | "draft" | "archived" | "internal" } {
  const raw = (contentStatus || "").toUpperCase();
  if (raw === "PUBLISHED" || raw === "ACTIVE") {
    return { label: "Published", tone: "published" };
  }
  if (raw === "DRAFT" || raw === "REVIEW" || raw === "SCHEDULED") {
    return { label: "Draft", tone: "draft" };
  }
  if (raw === "ARCHIVED" || raw === "RETIRED" || raw === "DELETED") {
    return { label: "Archived", tone: "archived" };
  }
  if (publicImpact) return { label: "Published", tone: "published" };
  return { label: "Internal", tone: "internal" };
}

export function healthColor(score: number): string {
  if (score >= 80) return "#15803d";
  if (score >= 60) return "#a16207";
  if (score >= 40) return "#c2410c";
  return "#b91c1c";
}

export type HealthLetter = "A+" | "A" | "B" | "C" | "D";

/** Letter grade from numeric score (A+ … D). */
export function healthLetterFromScore(score: number): HealthLetter {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
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

export function healthExplanation(input: {
  score: number;
  letter: HealthLetter;
  issues: string[];
  missingAlt?: boolean;
  missingCaption?: boolean;
  missingTitle?: boolean;
  missingKeywords?: boolean;
}): string {
  const reasons: string[] = [];
  if (input.missingAlt || input.issues.includes("missing_alt")) reasons.push("missing Alt");
  if (input.missingCaption || input.issues.includes("missing_caption")) {
    reasons.push("missing Caption");
  }
  if (input.missingTitle || input.issues.includes("missing_title")) reasons.push("missing Title");
  if (input.missingKeywords) reasons.push("missing Keywords");
  if (input.issues.includes("low_resolution")) reasons.push("low resolution");
  if (input.issues.includes("possible_duplicate") || input.issues.includes("confirmed_duplicate")) {
    reasons.push("duplicate risk");
  }
  if (input.issues.includes("unused")) reasons.push("unused");
  if (!reasons.length) {
    return input.score >= 80
      ? `Quality ${input.letter} — asset is in good shape.`
      : `Quality ${input.letter} — review remaining health signals.`;
  }
  return `Quality ${input.letter} because ${reasons.join(" and ")}.`;
}

export type HealthGroupTone = "green" | "yellow" | "red";

export type HealthGroup = {
  id: string;
  label: string;
  score: number;
  tone: HealthGroupTone;
};

export function toneFromScore(score: number): HealthGroupTone {
  if (score >= 75) return "green";
  if (score >= 45) return "yellow";
  return "red";
}

export function buildHealthGroups(
  health: AssetHealthBreakdown,
  rightsScore: number,
): HealthGroup[] {
  const seo = health.seo;
  const accessibility = Math.round((health.accessibility + health.alt) / 2);
  const imageQuality = Math.round((health.resolution + health.crop) / 2);
  const usage = Math.round((health.usage + health.bundle + health.suitability) / 3);
  return [
    { id: "seo", label: "SEO", score: seo, tone: toneFromScore(seo) },
    {
      id: "accessibility",
      label: "Accessibility",
      score: accessibility,
      tone: toneFromScore(accessibility),
    },
    {
      id: "image",
      label: "Image Quality",
      score: imageQuality,
      tone: toneFromScore(imageQuality),
    },
    { id: "usage", label: "Usage", score: usage, tone: toneFromScore(usage) },
    { id: "rights", label: "Rights", score: rightsScore, tone: toneFromScore(rightsScore) },
  ];
}

export function rightsHealthScore(rightsStatus: string, visibility: string): number {
  if (rightsStatus === "OWNED" || rightsStatus === "LICENSED") return 100;
  if (rightsStatus === "RESTRICTED") return 60;
  if (rightsStatus === "EXPIRED") return 20;
  if (rightsStatus === "UNKNOWN" && visibility === "PUBLIC") return 25;
  if (rightsStatus === "UNKNOWN") return 50;
  return 40;
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
    case "PUBLISHED":
      return "◎";
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
    APPLY_REPLACEMENT: "Replaced",
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
  statusTone: "published" | "draft" | "archived" | "internal";
  href: string | null;
  updatedHint: string | null;
};

export function toUsageCard(dep: MediaAssetDependency): UsageCardModel {
  const status = humanContentStatus(dep.contentStatus, dep.publicImpact);
  return {
    key: `${dep.referenceType}:${dep.referenceId}:${dep.field ?? ""}`,
    moduleLabel: humanModule(dep.referenceType),
    title: dep.referenceLabel || dep.referenceId,
    placement: humanField(dep.field),
    statusLabel: status.label,
    statusTone: status.tone,
    href: dep.referenceUrl,
    updatedHint: null,
  };
}

export function buildUsageTree(
  byModule: Record<string, MediaAssetDependency[]>,
): Array<{
  module: string;
  label: string;
  children: Array<{ id: string; key: string; label: string; field: string; href: string | null }>;
}> {
  return Object.entries(byModule).map(([module, rows]) => ({
    module,
    label: humanModule(module),
    children: rows.map((row) => ({
      id: row.referenceId,
      key: `${row.referenceType}:${row.referenceId}:${row.field ?? ""}`,
      label: row.referenceLabel || row.referenceId,
      field: humanField(row.field),
      href: row.referenceUrl,
    })),
  }));
}

export function humanSimilarRelation(relation: string): string {
  switch (relation) {
    case "DUPLICATE":
      return "Duplicate";
    case "SAME_HASH":
      return "Same Session";
    case "SAME_PRODUCT":
      return "Same Product";
    case "SAME_BUNDLE":
      return "Same Bundle";
    case "SAME_ROLE":
      return "Same Angle";
    case "SIMILAR_TERMS":
      return "Similar Look";
    default:
      return relation;
  }
}

export function humanHealthIssue(issue: string): string {
  const map: Record<string, string> = {
    missing_alt: "Missing Alt",
    missing_caption: "Missing Caption",
    missing_title: "Missing Title",
    low_resolution: "Low resolution",
    possible_duplicate: "Possible duplicate",
    confirmed_duplicate: "Confirmed duplicate",
    private_visibility: "Private visibility",
    no_bundle: "Not in a bundle",
    weak_suitability: "Weak suitability",
    unused: "Unused",
  };
  return map[issue] || issue.replace(/_/g, " ");
}

export type MetadataCheckItem = {
  id: "title" | "alt" | "caption" | "keywords";
  label: string;
  done: boolean;
};

export function buildMetadataChecklist(input: {
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  keywords?: string[] | null;
}): MetadataCheckItem[] {
  return [
    { id: "title", label: "Title", done: Boolean(input.title?.trim()) },
    { id: "alt", label: "Alt", done: Boolean(input.altText?.trim()) },
    { id: "caption", label: "Caption", done: Boolean(input.caption?.trim()) },
    {
      id: "keywords",
      label: "Keywords",
      done: Boolean(input.keywords && input.keywords.length > 0),
    },
  ];
}

export function metadataCompletionPercent(items: MetadataCheckItem[]): number {
  if (!items.length) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

export type WarningItem = {
  id: string;
  label: string;
  tab: WorkspacePrimaryTab;
};

export function buildWarningChecklist(input: {
  missingAlt: boolean;
  missingCaption: boolean;
  unknownRightsPublic: boolean;
  seoBelow: boolean;
}): WarningItem[] {
  const out: WarningItem[] = [];
  if (input.missingAlt) {
    out.push({ id: "alt", label: "Missing Alt", tab: "metadata" });
  }
  if (input.missingCaption) {
    out.push({ id: "caption", label: "Missing Caption", tab: "metadata" });
  }
  if (input.unknownRightsPublic) {
    out.push({ id: "rights", label: "Unknown Rights", tab: "lifecycle" });
  }
  if (input.seoBelow) {
    out.push({ id: "seo", label: "SEO below threshold", tab: "overview" });
  }
  return out;
}

export const toneColor: Record<HealthGroupTone, string> = {
  green: "#15803d",
  yellow: "#a16207",
  red: "#b91c1c",
};

export const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  background: "#fff",
};
