"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import MediaPicker, {
  type MediaPickerSelectedAsset,
} from "@/components/admin/media/MediaPicker";
import type {
  AssetHealthBreakdown,
  BetterImageCandidate,
  MediaTimelineEvent,
  SimilarAssetHit,
  SuggestedMediaMetadata,
} from "@/features/media/intelligence/intelligence.types";
import type {
  MediaDependencySummary,
  MediaReplacementPlan,
} from "@/features/media/lifecycle/lifecycle.types";
import { recommendAssetNextAction } from "@/features/media/lifecycle/next-action.service";
import {
  buildHealthGroups,
  buildMetadataChecklist,
  buildUsageTree,
  buildWarningChecklist,
  cardStyle,
  formatBytes,
  healthColor,
  healthExplanation,
  healthLetterFromScore,
  humanAiStatus,
  humanField,
  humanLifecycle,
  humanLifecycleAction,
  humanModule,
  humanRights,
  humanSeoReadiness,
  humanSimilarRelation,
  humanVisibility,
  lifecycleChipStyle,
  metadataCompletionPercent,
  primaryTabShortcutLabel,
  previewFrameStyle,
  relativeTime,
  resolvePrimaryTab,
  rightsHealthScore,
  timelineIcon,
  toneColor,
  toUsageCard,
  PREVIEW_MODES,
  WORKSPACE_PRIMARY_TABS,
  type PreviewMode,
  type UsageCardModel,
  type WorkspacePrimaryTab,
} from "@/features/media/workspace-ux";

type WorkspaceAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  caption: string | null;
  filename: string;
  originalName?: string | null;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  orientation: string;
  mimeType: string;
  sizeBytes: number;
  visibility: "PUBLIC" | "INTERNAL" | "PRIVATE";
  lifecycleStatus: "ACTIVE" | "REVIEW_REQUIRED" | "DEPRECATED" | "ARCHIVED" | "RETIRED";
  lifecycleReason: string | null;
  rightsStatus: string;
  rightsExpiresAt: string | null;
  rightsOwner: string | null;
  rightsNotes: string | null;
  usageRestriction: string | null;
  replacementAssetId: string | null;
  supersedesAssetId: string | null;
  seoScore: number;
  metadataCompleteness: number;
  seoReadinessStatus: string;
  aiProcessingStatus: string;
  duplicateStatus: string;
  dominantColor?: string | null;
  keywords?: string[];
  library: { id: string; code: string; name: string } | null;
  role: { id: string; code: string; name: string } | null;
  subjectTerms: string[];
  techniqueTerms?: string[];
  useCaseTerms?: string[];
  contentSuitabilities: string[];
  metadata?: unknown;
  updatedAt: string;
  createdAt: string;
  _count: {
    contentMediaAssignments: number;
    bundleSlotAssets: number;
    collections: number;
  };
};

function refKey(type: string, id: string, field: string | null) {
  return `${type}:${id}:${field ?? ""}`;
}

function readSuggested(metadata: unknown): SuggestedMediaMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const intelligent = (metadata as Record<string, unknown>).intelligent;
  if (!intelligent || typeof intelligent !== "object") return null;
  const suggested = (intelligent as Record<string, unknown>).suggested;
  if (!suggested || typeof suggested !== "object") return null;
  return suggested as SuggestedMediaMetadata;
}

function usageStatusColor(tone: UsageCardModel["statusTone"]): string {
  switch (tone) {
    case "published":
      return "#15803d";
    case "draft":
      return "#a16207";
    case "archived":
      return "#6b7280";
    case "internal":
      return "#2563eb";
    default:
      return "#6b7280";
  }
}

function betterQualityLabel(item: BetterImageCandidate): string {
  return /seo/i.test(item.reason) ? "Better SEO" : "Higher Quality";
}

const USAGE_GROUP_ORDER = [
  { key: "PRODUCT", label: "Products" },
  { key: "BLOG", label: "Blogs" },
  { key: "CATEGORY", label: "Landing Pages" },
  { key: "CASE_STUDY", label: "Case Studies" },
  { key: "COLLECTION", label: "Collections" },
] as const;

function metadataFieldFill(value: string | null | undefined): number {
  const length = (value || "").trim().length;
  if (length === 0) return 0;
  if (length >= 80) return 100;
  return Math.max(25, Math.round((length / 80) * 100));
}

function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height: 14,
            borderRadius: 6,
            background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)",
            backgroundSize: "300% 100%",
            animation: "ws-skeleton 1.2s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

export default function MediaAssetWorkspaceClient({ assetId }: { assetId: string }) {
  const toast = useAdminToast();
  const searchParams = useSearchParams();
  const topRef = useRef<HTMLDivElement | null>(null);

  const [primaryTab, setPrimaryTabState] = useState<WorkspacePrimaryTab>(() =>
    resolvePrimaryTab(searchParams.get("section")),
  );
  const [asset, setAsset] = useState<WorkspaceAsset | null>(null);
  const [deps, setDeps] = useState<MediaDependencySummary | null>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<
    Array<{
      id: string;
      action: string;
      fromStatus: string | null;
      toStatus: string | null;
      reason: string | null;
      createdAt: string;
    }>
  >([]);
  const [health, setHealth] = useState<AssetHealthBreakdown | null>(null);
  const [similar, setSimilar] = useState<SimilarAssetHit[]>([]);
  const [better, setBetter] = useState<BetterImageCandidate[]>([]);
  const [intelTimeline, setIntelTimeline] = useState<MediaTimelineEvent[]>([]);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [depsLoading, setDepsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<SuggestedMediaMetadata | null>(null);
  const [showMetadataPreview, setShowMetadataPreview] = useState(false);
  const [highlightedUsageKey, setHighlightedUsageKey] = useState<string | null>(null);

  const [replacementId, setReplacementId] = useState("");
  const [replacementAsset, setReplacementAsset] = useState<MediaPickerSelectedAsset | null>(null);
  const [showManualReplacementId, setShowManualReplacementId] = useState(false);
  const [plan, setPlan] = useState<MediaReplacementPlan | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [confirmApply, setConfirmApply] = useState(false);
  const [highImpactConfirm, setHighImpactConfirm] = useState("");
  const [applyResult, setApplyResult] = useState<{
    updated: number;
    skipped: number;
    failed: number;
    verified: boolean;
  } | null>(null);

  const setPrimaryTab = useCallback((tab: WorkspacePrimaryTab) => {
    setPrimaryTabState(tab);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const loadAsset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${assetId}`);
      const data = (await res.json()) as WorkspaceAsset & { message?: string };
      if (!res.ok) throw new Error(data.message || "Không tải được asset");
      setAsset(data);
      setReplacementId(data.replacementAssetId ?? "");
      setPendingSuggestion(readSuggested(data.metadata));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải asset");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const loadDeps = useCallback(async () => {
    setDepsLoading(true);
    try {
      const res = await fetch(`/api/media/${assetId}/dependencies`);
      const data = (await res.json()) as MediaDependencySummary & { message?: string };
      if (!res.ok) throw new Error(data.message || "Không tải được dependencies");
      setDeps(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể tải đầy đủ nơi đang sử dụng ảnh.",
      );
    } finally {
      setDepsLoading(false);
    }
  }, [assetId, toast]);

  const loadLifecycle = useCallback(async () => {
    try {
      const res = await fetch(`/api/media/${assetId}/lifecycle`);
      const data = (await res.json()) as {
        asset?: { lifecycleEvents?: typeof lifecycleEvents };
        message?: string;
      };
      if (res.ok) setLifecycleEvents(data.asset?.lifecycleEvents ?? []);
    } catch {
      /* soft-fail */
    }
  }, [assetId]);

  const loadSecondary = useCallback(async () => {
    if (secondaryLoaded || secondaryLoading) return;
    setSecondaryLoading(true);
    try {
      const [healthRes, similarRes, betterRes, timelineRes, depsRes] = await Promise.all([
        fetch(`/api/media/intelligence/${assetId}/health`),
        fetch(`/api/media/intelligence/${assetId}/related?view=similar&limit=8`),
        fetch(`/api/media/intelligence/${assetId}/related?view=better`),
        fetch(`/api/media/intelligence/${assetId}/related?view=timeline`),
        fetch(`/api/media/${assetId}/dependencies`),
      ]);
      if (healthRes.ok) {
        const data = (await healthRes.json()) as { health?: AssetHealthBreakdown };
        setHealth(data.health ?? null);
      }
      if (similarRes.ok) {
        const data = (await similarRes.json()) as { similar?: SimilarAssetHit[] };
        setSimilar(data.similar ?? []);
      }
      if (betterRes.ok) {
        const data = (await betterRes.json()) as { better?: BetterImageCandidate[] };
        setBetter(data.better ?? []);
      }
      if (timelineRes.ok) {
        const data = (await timelineRes.json()) as { events?: MediaTimelineEvent[] };
        setIntelTimeline(data.events ?? []);
      }
      if (depsRes.ok) {
        const data = (await depsRes.json()) as MediaDependencySummary;
        setDeps(data);
      }
      setSecondaryLoaded(true);
    } catch {
      toast.error("Không tải được một số panel phụ.");
    } finally {
      setSecondaryLoading(false);
    }
  }, [assetId, secondaryLoaded, secondaryLoading, toast]);

  useEffect(() => {
    void loadAsset();
    void loadLifecycle();
  }, [loadAsset, loadLifecycle]);

  useEffect(() => {
    if (!loading && asset) {
      const t = window.setTimeout(() => void loadSecondary(), 50);
      return () => window.clearTimeout(t);
    }
  }, [loading, asset, loadSecondary]);

  useEffect(() => {
    if (primaryTab === "usage" || primaryTab === "lifecycle") void loadDeps();
    // Lazy on-demand load only — no change to automatic load-on-mount fetch count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTab]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey) return;
      const digit = Number(event.key);
      if (!Number.isInteger(digit) || digit < 1 || digit > WORKSPACE_PRIMARY_TABS.length) return;
      const tab = WORKSPACE_PRIMARY_TABS[digit - 1];
      if (!tab) return;
      event.preventDefault();
      setPrimaryTab(tab.id);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPrimaryTab]);

  const nextAction = useMemo(() => {
    if (!asset) return null;
    return recommendAssetNextAction({
      altText: asset.altText,
      title: asset.title,
      lifecycleStatus: asset.lifecycleStatus,
      visibility: asset.visibility,
      rightsStatus: asset.rightsStatus as never,
      rightsExpiresAt: asset.rightsExpiresAt ? new Date(asset.rightsExpiresAt) : null,
      publicReferenceCount: deps?.publicCount ?? 0,
      totalReferenceCount: deps?.total ?? asset._count.contentMediaAssignments,
      replacementAssetId: asset.replacementAssetId,
      duplicateStatus: asset.duplicateStatus,
      bundleCount: asset._count.bundleSlotAssets,
      seoScore: asset.seoScore,
    });
  }, [asset, deps]);

  const metaChecklist = useMemo(() => {
    if (!asset) return [];
    return buildMetadataChecklist({
      title: asset.title,
      altText: asset.altText,
      caption: asset.caption,
      keywords: asset.keywords,
    });
  }, [asset]);

  const completionPct = useMemo(() => metadataCompletionPercent(metaChecklist), [metaChecklist]);

  const warningChecklist = useMemo(() => {
    if (!asset) return [];
    return buildWarningChecklist({
      missingAlt: !asset.altText?.trim(),
      missingCaption: !asset.caption?.trim(),
      unknownRightsPublic: asset.rightsStatus === "UNKNOWN" && asset.visibility === "PUBLIC",
      seoBelow: (asset.seoScore ?? 0) < 50,
    });
  }, [asset]);

  const usageCards = useMemo(() => {
    if (!deps) return [];
    return deps.references.map(toUsageCard);
  }, [deps]);

  const usageTree = useMemo(() => {
    if (!deps) return [];
    return buildUsageTree(deps.byModule);
  }, [deps]);

  const mergedTimeline = useMemo(() => {
    const rows: Array<{
      key: string;
      at: string;
      icon: string;
      summary: string;
      detail?: string;
    }> = [];
    if (asset) {
      rows.push({
        key: "uploaded",
        at: asset.createdAt,
        icon: timelineIcon("UPLOADED"),
        summary: "Uploaded",
        detail: asset.originalName || asset.filename,
      });
    }
    for (const ev of intelTimeline) {
      rows.push({
        key: `intel-${ev.type}-${ev.at}-${ev.summary}`,
        at: ev.at,
        icon: timelineIcon(ev.type),
        summary: ev.summary,
      });
    }
    for (const ev of lifecycleEvents) {
      rows.push({
        key: ev.id,
        at: ev.createdAt,
        icon: timelineIcon(
          ev.action.includes("REPLACEMENT") ? "REPLACEMENT" : "LIFECYCLE",
        ),
        summary: humanLifecycleAction(ev.action),
        detail: `${ev.fromStatus || "—"} → ${ev.toStatus || "—"}${ev.reason ? ` — ${ev.reason}` : ""}`,
      });
    }
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [asset, intelTimeline, lifecycleEvents]);

  const usageGroups = useMemo(() => {
    const grouped = new Map<string, UsageCardModel[]>();
    for (const item of usageCards) {
      const sourceType = item.key.split(":")[0] || "";
      const groupKey =
        sourceType === "PRODUCT"
          ? "PRODUCT"
          : sourceType === "BLOG"
            ? "BLOG"
            : sourceType === "CATEGORY"
              ? "CATEGORY"
              : sourceType === "CASE_STUDY"
                ? "CASE_STUDY"
                : sourceType === "COLLECTION"
                  ? "COLLECTION"
                  : null;
      if (!groupKey) continue;
      const existing = grouped.get(groupKey) ?? [];
      existing.push(item);
      grouped.set(groupKey, existing);
    }
    return USAGE_GROUP_ORDER.map((group) => ({
      ...group,
      items: grouped.get(group.key) ?? [],
    }));
  }, [usageCards]);

  async function transition(toStatus: string) {
    if (!reason.trim() && ["DEPRECATED", "ARCHIVED", "RETIRED"].includes(toStatus)) {
      toast.error("Cần ghi lý do");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/media/${assetId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reason }),
      });
      const data = (await res.json()) as { message?: string; code?: string };
      if (!res.ok) {
        toast.error(data.message ?? data.code ?? "Thao tác lifecycle thất bại");
        return;
      }
      toast.success(`Đã chuyển → ${toStatus}`);
      await loadAsset();
      await loadLifecycle();
    } finally {
      setBusy(false);
    }
  }

  async function buildPlan() {
    if (!replacementId.trim()) {
      toast.error("Chọn ảnh thay thế từ thư viện Media");
      return;
    }
    setBusy(true);
    setApplyResult(null);
    try {
      await fetch(`/api/media/${assetId}/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          replacementAssetId: replacementId.trim(),
          reason,
        }),
      });
      const res = await fetch(`/api/media/${assetId}/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", replacementAssetId: replacementId.trim() }),
      });
      const data = (await res.json()) as MediaReplacementPlan & {
        message?: string;
        code?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? data.code ?? "Không tạo được plan");
        return;
      }
      setPlan(data);
      const auto = new Set(
        data.items
          .filter((i) => i.decision === "AUTO")
          .map((i) => refKey(i.referenceType, i.referenceId, i.field)),
      );
      setSelectedKeys(auto);
      toast.success(`Preview: ${data.replaceableAutomatically} có thể thay tự động`);
    } finally {
      setBusy(false);
    }
  }

  async function applySelected() {
    if (!plan || !confirmApply) {
      toast.error("Cần xác nhận trước khi Apply");
      return;
    }
    const publicSelected = plan.items.filter(
      (i) =>
        i.publicImpact &&
        selectedKeys.has(refKey(i.referenceType, i.referenceId, i.field)),
    ).length;
    if (publicSelected > 10 && highImpactConfirm.trim() !== "REPLACE") {
      toast.error("Thao tác ảnh hưởng nhiều nội dung công khai — gõ REPLACE để xác nhận");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/media/${assetId}/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          mode: "APPLY_SELECTED",
          replacementAssetId: plan.replacementAssetId,
          selectedKeys: [...selectedKeys],
          planToken: plan.planToken,
          reason: reason || "Selective replacement from Asset Workspace",
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        code?: string;
        updated?: number;
        skipped?: number;
        failed?: number;
        verified?: boolean;
      };
      if (!res.ok) {
        toast.error(
          data.code === "PLAN_STALE"
            ? "Kế hoạch đã lỗi thời — hãy tạo lại preview"
            : data.message ?? data.code ?? "Apply thất bại",
        );
        return;
      }
      setApplyResult({
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        verified: data.verified ?? false,
      });
      toast.success(`Đã cập nhật ${data.updated ?? 0} tham chiếu`);
      await loadDeps();
      await loadAsset();
    } finally {
      setBusy(false);
    }
  }

  async function generateSuggestions() {
    setBusy(true);
    try {
      const res = await fetch("/api/media/intelligence/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId: assetId }),
      });
      const data = (await res.json()) as {
        message?: string;
        suggested?: SuggestedMediaMetadata;
      };
      if (!res.ok) {
        toast.error(data.message || "Không sinh được gợi ý");
        return;
      }
      if (data.suggested) setPendingSuggestion(data.suggested);
      toast.success("Đã tạo gợi ý metadata — hãy Approve / Reject từng trường.");
      await loadAsset();
      setSecondaryLoaded(false);
    } finally {
      setBusy(false);
    }
  }

  async function approveSuggestions() {
    setBusy(true);
    try {
      const res = await fetch(`/api/media/intelligence/${assetId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applySuggestions: true }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Approve thất bại");
        return;
      }
      toast.success("Đã duyệt metadata gợi ý");
      await loadAsset();
    } finally {
      setBusy(false);
    }
  }

  async function rejectSuggestions() {
    setPendingSuggestion(null);
    setShowMetadataPreview(false);
    toast.success("Đã bỏ gợi ý (không ghi đè dữ liệu hiện có).");
  }

  async function patchField(patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/media/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "Cập nhật thất bại");
        return;
      }
      toast.success("Đã cập nhật");
      await loadAsset();
    } finally {
      setBusy(false);
    }
  }

  const lifecycleActions = useMemo(() => {
    if (!asset) return [] as Array<{ label: string; to: string }>;
    switch (asset.lifecycleStatus) {
      case "ACTIVE":
        return [
          { label: "Mark review required", to: "REVIEW_REQUIRED" },
          { label: "Deprecate", to: "DEPRECATED" },
          { label: "Archive", to: "ARCHIVED" },
        ];
      case "REVIEW_REQUIRED":
        return [
          { label: "Restore ACTIVE", to: "ACTIVE" },
          { label: "Deprecate", to: "DEPRECATED" },
          { label: "Archive", to: "ARCHIVED" },
        ];
      case "DEPRECATED":
        return [
          { label: "Restore ACTIVE", to: "ACTIVE" },
          { label: "Archive", to: "ARCHIVED" },
          { label: "Retire", to: "RETIRED" },
        ];
      case "ARCHIVED":
        return [
          { label: "Restore ACTIVE", to: "ACTIVE" },
          { label: "Retire", to: "RETIRED" },
        ];
      case "RETIRED":
        return [{ label: "Restore ACTIVE", to: "ACTIVE" }];
      default:
        return [];
    }
  }, [asset]);

  const frame = previewFrameStyle(previewMode);
  const suggested = pendingSuggestion || (asset ? readSuggested(asset.metadata) : null);
  const recommended = (
    suggested?.suggestedSuitabilities?.length
      ? suggested.suggestedSuitabilities
      : [...(asset?.contentSuitabilities ?? []), ...(asset?.useCaseTerms ?? [])]
  ).slice(0, 6);
  const notRecommended = (asset?.width ?? 0) < 1200 ? ["Hero Banner", "Homepage Cover"] : [];

  if (loading) return <InlineLoading title="Đang tải Asset Workspace…" />;
  if (error || !asset) {
    return (
      <div>
        <AdminPageTitle title="Asset Workspace" />
        <p style={{ color: "#b91c1c" }}>{error || "Không tìm thấy asset"}</p>
        <Link href="/admin/media" className="admin-btn admin-btn--secondary">
          Về thư viện
        </Link>
      </div>
    );
  }

  const useCount = deps?.total ?? asset._count.contentMediaAssignments;
  const healthScore = health?.total ?? asset.seoScore;
  const healthLetter = healthLetterFromScore(healthScore);
  const rightsScore = rightsHealthScore(asset.rightsStatus, asset.visibility);
  const healthGroups = health ? buildHealthGroups(health, rightsScore) : [];
  const healthReasonText = healthExplanation({
    score: healthScore,
    letter: healthLetter,
    issues: health?.issues ?? [],
    missingAlt: !asset.altText?.trim(),
    missingCaption: !asset.caption?.trim(),
    missingTitle: !asset.title?.trim(),
    missingKeywords: !(asset.keywords && asset.keywords.length > 0),
  });

  return (
    <div className="admin-media-workspace" style={{ overflowX: "hidden" }}>
      <div ref={topRef} tabIndex={-1} aria-hidden="true" />
      <AdminPageTitle title={asset.title || asset.filename || "Asset Workspace"} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Link href="/admin/media" className="admin-btn admin-btn--secondary admin-btn--xs">
          Thư viện
        </Link>
        <Link href="/admin/media/dashboard" className="admin-btn admin-btn--secondary admin-btn--xs">
          Dashboard
        </Link>
        <Link href="/admin/media/lifecycle" className="admin-btn admin-btn--secondary admin-btn--xs">
          Lifecycle
        </Link>
      </div>

      {/* Quick Actions toolbar */}
      <div
        role="toolbar"
        aria-label="Quick actions"
        style={{
          ...cardStyle,
          display: "grid",
          gap: 12,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>AI</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              disabled={busy}
              onClick={() => void generateSuggestions()}
            >
              Generate Metadata
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              disabled={busy || !suggested}
              onClick={() => void approveSuggestions()}
            >
              Approve Metadata
            </button>
          </div>
        </div>
        <div style={{ height: 1, background: "#e5e7eb" }} />
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Use</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={asset.url}
              download={asset.filename}
              className="admin-btn admin-btn--secondary admin-btn--xs"
            >
              Download
            </a>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => {
                void navigator.clipboard.writeText(asset.url);
                toast.success("Đã copy URL");
              }}
            >
              Copy URL
            </button>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn--secondary admin-btn--xs"
            >
              Open Source
            </a>
          </div>
        </div>
        <div style={{ height: 1, background: "#e5e7eb" }} />
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
            Manage
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => setPrimaryTab("lifecycle")}
            >
              Replace
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              disabled={busy || asset.lifecycleStatus === "ARCHIVED"}
              onClick={() => {
                setPrimaryTab("lifecycle");
                setReason((r) => r || "Archive from workspace");
              }}
            >
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Primary tabs */}
      <nav
        role="tablist"
        aria-label="Workspace sections"
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}
      >
        {WORKSPACE_PRIMARY_TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={primaryTab === tab.id}
            className={`admin-btn admin-btn--xs ${primaryTab === tab.id ? "admin-btn--primary" : "admin-btn--secondary"}`}
            onClick={() => setPrimaryTab(tab.id)}
          >
            {tab.label} <span style={{ opacity: 0.7 }}>({primaryTabShortcutLabel(index)})</span>
          </button>
        ))}
      </nav>

      <div
        className="admin-media-workspace-layout"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20, alignItems: "start" }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          {/* ---------------------------------------------------------------- */}
          {/* OVERVIEW TAB                                                    */}
          {/* ---------------------------------------------------------------- */}
          {primaryTab === "overview" ? (
            <>
              <section style={cardStyle} aria-labelledby="ws-overview-title">
                <h3 id="ws-overview-title" style={{ marginTop: 0 }}>
                  Preview
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {PREVIEW_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`admin-btn admin-btn--xs ${previewMode === mode.id ? "admin-btn--primary" : "admin-btn--secondary"}`}
                      aria-pressed={previewMode === mode.id}
                      onClick={() => setPreviewMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <div
                  className="admin-media-preview-frame"
                  style={{
                    maxWidth: frame.maxWidth,
                    height: frame.height,
                    margin: "0 auto 16px",
                    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #e5e7eb",
                    transition: "max-width .25s ease, height .25s ease",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.altText || asset.title || asset.filename}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>

                <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>{asset.title || asset.filename}</h2>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{asset.filename}</div>
                <div
                  style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, fontFamily: "ui-monospace, monospace" }}
                >
                  ID {asset.id}
                </div>

                <div
                  style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}
                  aria-label="Asset status badges"
                >
                  <span style={lifecycleChipStyle(asset.lifecycleStatus)}>
                    {humanLifecycle(asset.lifecycleStatus)}
                  </span>
                  <span className="admin-badge">{humanVisibility(asset.visibility)}</span>
                  {asset.role?.name ? <span className="admin-badge">{asset.role.name}</span> : null}
                  {asset.library?.name ? <span className="admin-badge">{asset.library.name}</span> : null}
                  <span className="admin-badge">
                    {asset.width || "?"}×{asset.height || "?"}
                  </span>
                  <span className="admin-badge">{formatBytes(asset.sizeBytes)}</span>
                  <span className="admin-badge" style={{ fontWeight: 700 }}>
                    Quality {healthLetter}
                  </span>
                  <span className="admin-badge">SEO {asset.seoScore}</span>
                  <span className="admin-badge">Completeness {completionPct}%</span>
                  <span className="admin-badge">Used by {useCount}</span>
                </div>
              </section>

              <section style={cardStyle} aria-labelledby="ws-hero-summary-title">
                <h3 id="ws-hero-summary-title" style={{ marginTop: 0 }}>
                  Hero Summary
                </h3>
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  <div>
                    Lifecycle <strong>{humanLifecycle(asset.lifecycleStatus)}</strong> · Visibility{" "}
                    <strong>{humanVisibility(asset.visibility)}</strong> · Rights{" "}
                    <strong>{humanRights(asset.rightsStatus)}</strong>
                  </div>
                  <div>
                    SEO <strong>{asset.seoScore}</strong> · Completeness <strong>{completionPct}%</strong> · Uses{" "}
                    <strong>{useCount}</strong>
                  </div>
                </div>
              </section>

              <section style={cardStyle} aria-labelledby="ws-health-title">
                <h3 id="ws-health-title" style={{ marginTop: 0 }}>
                  Health Summary
                </h3>
                {secondaryLoading && !health ? <SkeletonRows rows={4} /> : null}
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: healthColor(healthScore) }}>
                    {healthScore}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>Overall Score · {healthLetter}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 420 }}>{healthReasonText}</div>
                  </div>
                </div>
                {health ? (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="Health chips">
                      {healthGroups.map((group) => (
                        <span
                          key={group.id}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: "#f8fafc",
                            border: `1px solid ${toneColor[group.tone]}33`,
                            color: toneColor[group.tone],
                          }}
                        >
                          {group.label} · {group.score}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: "#6b7280", fontSize: 13 }}>Chi tiết health sẽ hiển thị sau khi tải panel phụ.</p>
                )}
              </section>

              <section style={cardStyle} aria-labelledby="ws-warnings-title">
                <h3 id="ws-warnings-title" style={{ marginTop: 0 }}>
                  Warning Summary
                </h3>
                <div style={{ display: "grid", gap: 6 }}>
                  {warningChecklist.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => {
                        setPrimaryTab(w.tab);
                        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      ⚠ {w.label}
                    </button>
                  ))}
                  {!warningChecklist.length ? (
                    <p style={{ margin: 0, color: "#15803d", fontSize: 13 }}>No active warnings.</p>
                  ) : null}
                </div>
              </section>

              <section style={cardStyle} aria-labelledby="ws-overview-actions-title">
                <h3 id="ws-overview-actions-title" style={{ marginTop: 0 }}>
                  Quick Actions
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => setPrimaryTab("metadata")}
                  >
                    Open Metadata
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => setPrimaryTab("usage")}
                  >
                    Open Usage
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => setPrimaryTab("lifecycle")}
                  >
                    Open Lifecycle
                  </button>
                </div>
              </section>
            </>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* USAGE TAB                                                       */}
          {/* ---------------------------------------------------------------- */}
          {primaryTab === "usage" ? (
            <section style={cardStyle} aria-labelledby="ws-usage-title">
              <h3 id="ws-usage-title" style={{ marginTop: 0 }}>
                Usage
              </h3>
              {depsLoading && !deps ? <SkeletonRows rows={5} /> : null}
              {deps ? (
                <>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    Total {deps.total} · Public {deps.publicCount} · Internal {deps.internalCount} · Replaceable{" "}
                    {deps.replaceableCount}
                  </p>
                  <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
                    {usageGroups.map((group) => (
                      <div key={group.key}>
                        <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{group.label}</h4>
                        <div style={{ display: "grid", gap: 10 }}>
                          {group.items.map((card) => (
                            <article
                              key={card.key}
                              onClick={() => setHighlightedUsageKey(card.key)}
                              style={{
                                border:
                                  highlightedUsageKey === card.key ? "1px solid #6366f1" : "1px solid #f3f4f6",
                                borderRadius: 8,
                                padding: 12,
                                background: highlightedUsageKey === card.key ? "#eef2ff" : "#fafafa",
                                cursor: "pointer",
                                transition: "background .15s ease, border-color .15s ease",
                              }}
                            >
                              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>
                                {card.moduleLabel}
                              </div>
                              <div style={{ fontWeight: 600, marginTop: 2 }}>{card.title}</div>
                              <div style={{ fontSize: 13, marginTop: 4 }}>
                                {card.placement} ·{" "}
                                <span style={{ color: usageStatusColor(card.statusTone), fontWeight: 600 }}>
                                  {card.statusLabel}
                                </span>
                              </div>
                              {card.href ? (
                                <Link
                                  href={card.href}
                                  className="admin-btn admin-btn--secondary admin-btn--xs"
                                  style={{ marginTop: 8, display: "inline-flex" }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open →
                                </Link>
                              ) : null}
                            </article>
                          ))}
                          {!group.items.length ? (
                            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>No items.</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {usageCards.length === 0 ? (
                      <p style={{ color: "#6b7280", margin: 0 }}>Asset is not used anywhere.</p>
                    ) : null}
                  </div>

                  <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Usage graph</h4>
                  <p className="admin-field-hint" style={{ marginTop: 0 }}>
                    Bấm vào một nhánh để làm nổi bật thẻ tương ứng phía trên.
                  </p>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      padding: 12,
                      fontSize: 13,
                    }}
                  >
                    {usageTree.map((mod) => (
                      <div key={mod.module} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 700 }}>{humanModule(mod.module)}</div>
                        <ul style={{ listStyle: "none", margin: "4px 0 0", paddingLeft: 16 }}>
                          {mod.children.map((child) => (
                            <li key={child.key}>
                              <button
                                type="button"
                                onClick={() => setHighlightedUsageKey(child.key)}
                                style={{
                                  border: "none",
                                  background:
                                    highlightedUsageKey === child.key ? "#e0e7ff" : "transparent",
                                  color: highlightedUsageKey === child.key ? "#3730a3" : "#374151",
                                  borderRadius: 4,
                                  padding: "2px 6px",
                                  margin: "1px 0",
                                  cursor: "pointer",
                                  fontSize: 13,
                                  textAlign: "left",
                                }}
                              >
                                └── {child.field}: {child.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* METADATA TAB                                                    */}
          {/* ---------------------------------------------------------------- */}
          {primaryTab === "metadata" ? (
            <section style={cardStyle} aria-labelledby="ws-metadata-title">
              <h3 id="ws-metadata-title" style={{ marginTop: 0 }}>
                Metadata Assistant
              </h3>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                {completionPct}% complete · AI: {humanAiStatus(asset.aiProcessingStatus)}
              </div>
              <div
                style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}
              >
                <div
                  style={{
                    width: `${completionPct}%`,
                    height: "100%",
                    background: completionPct >= 75 ? "#15803d" : completionPct >= 40 ? "#a16207" : "#b91c1c",
                    transition: "width .25s ease",
                  }}
                />
              </div>
              {secondaryLoading && !secondaryLoaded ? <SkeletonRows rows={4} /> : null}
              <div style={{ margin: "0 0 16px", display: "grid", gap: 10 }}>
                {[
                  { label: "Title", pct: metadataFieldFill(asset.title) },
                  { label: "Alt", pct: metadataFieldFill(asset.altText) },
                  { label: "Caption", pct: metadataFieldFill(asset.caption) },
                  {
                    label: "Keywords",
                    pct: asset.keywords && asset.keywords.length > 0 ? Math.min(100, asset.keywords.length * 25) : 0,
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>{field.label}</span>
                      <span>{field.pct}%</span>
                    </div>
                    <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${field.pct}%`,
                          height: "100%",
                          background: field.pct >= 75 ? "#15803d" : field.pct >= 40 ? "#a16207" : "#b91c1c",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={busy}
                  onClick={() => void generateSuggestions()}
                >
                  Generate
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--xs"
                  disabled={busy || !suggested}
                  onClick={() => void approveSuggestions()}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={busy || !suggested}
                  onClick={() => void rejectSuggestions()}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  disabled={!suggested}
                  onClick={() => setShowMetadataPreview((v) => !v)}
                >
                  {showMetadataPreview ? "Hide preview" : "Preview changes"}
                </button>
                {!asset.altText && suggested?.altText ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    disabled={busy}
                    onClick={() => void patchField({ altText: suggested.altText })}
                  >
                    Apply alt only
                  </button>
                ) : null}
              </div>

              {showMetadataPreview && suggested ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: "#6b7280" }}>Current</div>
                    <div>
                      <strong>Title:</strong> {asset.title || "—"}
                    </div>
                    <div>
                      <strong>Alt:</strong> {asset.altText || "—"}
                    </div>
                    <div>
                      <strong>Caption:</strong> {asset.caption || "—"}
                    </div>
                    <div>
                      <strong>Keywords:</strong> {asset.keywords?.join(", ") || "—"}
                    </div>
                  </div>
                  <div style={{ border: "1px solid #dbeafe", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: "#1e40af" }}>Suggested (AI)</div>
                    <div>
                      <strong>Title:</strong> {suggested.title || "—"}
                    </div>
                    <div>
                      <strong>Alt:</strong> {suggested.altText || "—"}
                    </div>
                    <div>
                      <strong>Caption:</strong> {suggested.caption || "—"}
                    </div>
                    <div>
                      <strong>Keywords:</strong> {suggested.keywords?.join(", ") || "—"}
                    </div>
                  </div>
                </div>
              ) : null}

              <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", fontSize: 13 }}>
                <dt>Title</dt>
                <dd style={{ margin: 0 }}>{asset.title || <span style={{ color: "#b91c1c" }}>Missing</span>}</dd>
                <dt>Alt</dt>
                <dd style={{ margin: 0 }}>{asset.altText || <span style={{ color: "#b91c1c" }}>Missing</span>}</dd>
                <dt>Caption</dt>
                <dd style={{ margin: 0 }}>{asset.caption || <span style={{ color: "#b91c1c" }}>Missing</span>}</dd>
                <dt>Keywords</dt>
                <dd style={{ margin: 0 }}>
                  {(asset.keywords && asset.keywords.length > 0 ? asset.keywords.join(", ") : null) || (
                    <span style={{ color: "#b91c1c" }}>Missing</span>
                  )}
                </dd>
                <dt>Subjects</dt>
                <dd style={{ margin: 0 }}>{asset.subjectTerms.join(", ") || "—"}</dd>
                <dt>Collections / Bundles</dt>
                <dd style={{ margin: 0 }}>
                  {asset._count.collections} / {asset._count.bundleSlotAssets}
                </dd>
              </dl>

              <p className="admin-field-hint" style={{ marginTop: 12, marginBottom: 0 }}>
                Không tự áp dụng — editor phải Approve / Apply.
              </p>
            </section>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* LIFECYCLE TAB (Lifecycle + Timeline + Rights + Replacement)     */}
          {/* ---------------------------------------------------------------- */}
          {primaryTab === "lifecycle" ? (
            <>
              <section style={cardStyle} aria-labelledby="ws-lifecycle-title">
                <h3 id="ws-lifecycle-title" style={{ marginTop: 0 }}>
                  Lifecycle
                </h3>
                <p style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={lifecycleChipStyle(asset.lifecycleStatus)}>
                    {humanLifecycle(asset.lifecycleStatus)}
                  </span>
                  {asset.lifecycleReason ? <span style={{ color: "#6b7280" }}>{asset.lifecycleReason}</span> : null}
                </p>
                {deps && deps.publicCount > 0 ? (
                  <p style={{ fontSize: 13, color: "#92400e" }}>
                    Ảnh đang được sử dụng tại {deps.publicCount} vị trí công khai. Lưu trữ không làm mất ảnh hiện
                    tại, nhưng ảnh sẽ không còn được đề xuất cho nội dung mới.
                  </p>
                ) : null}
                <label className="admin-field-hint" style={{ display: "block", marginBottom: 10 }}>
                  Lý do
                  <input
                    className="admin-input"
                    style={{ display: "block", marginTop: 4, maxWidth: 420 }}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {lifecycleActions.map((action) => (
                    <button
                      key={action.to}
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      disabled={busy}
                      onClick={() => void transition(action.to)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>

              <section style={cardStyle} aria-labelledby="ws-timeline-title">
                <h3 id="ws-timeline-title" style={{ marginTop: 0 }}>
                  Timeline
                </h3>
                {secondaryLoading && !secondaryLoaded ? <SkeletonRows rows={4} /> : null}
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {mergedTimeline.map((row, idx) => (
                    <li
                      key={row.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr",
                        gap: 10,
                        marginBottom: 12,
                        fontSize: 13,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          background: "#eef2ff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {row.icon}
                        {idx < mergedTimeline.length - 1 ? (
                          <span
                            style={{
                              position: "absolute",
                              top: 28,
                              left: "50%",
                              width: 2,
                              height: 24,
                              background: "#d1d5db",
                              transform: "translateX(-50%)",
                            }}
                          />
                        ) : null}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{row.summary}</div>
                        {row.detail ? <div style={{ color: "#6b7280" }}>{row.detail}</div> : null}
                        <div style={{ color: "#9ca3af", fontSize: 12 }}>
                          {new Date(row.at).toLocaleString()} · {relativeTime(row.at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section style={cardStyle} aria-labelledby="ws-rights-title">
                <h3 id="ws-rights-title" style={{ marginTop: 0 }}>
                  Rights
                </h3>
                <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 12px", fontSize: 13 }}>
                  <dt>Status</dt>
                  <dd style={{ margin: 0 }}>{humanRights(asset.rightsStatus)}</dd>
                  <dt>Owner</dt>
                  <dd style={{ margin: 0 }}>{asset.rightsOwner || "—"}</dd>
                  <dt>Expires</dt>
                  <dd style={{ margin: 0 }}>{asset.rightsExpiresAt || "—"}</dd>
                  <dt>Restriction</dt>
                  <dd style={{ margin: 0 }}>{asset.usageRestriction || "—"}</dd>
                  <dt>Notes</dt>
                  <dd style={{ margin: 0 }}>{asset.rightsNotes || "—"}</dd>
                </dl>
                {asset.rightsStatus === "UNKNOWN" && asset.visibility === "PUBLIC" ? (
                  <p style={{ fontSize: 13, color: "#92400e" }}>Unknown rights trên ảnh PUBLIC — cần editor review.</p>
                ) : null}
              </section>

              <section style={cardStyle} aria-labelledby="ws-replacement-title">
                <h3 id="ws-replacement-title" style={{ marginTop: 0 }}>
                  Replacement
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  Preview bắt buộc trước Apply. Không tự động thay thế. Không copy/move file.
                </p>

                <div style={{ marginBottom: 8 }}>
                  <MediaPicker
                    label="Ảnh thay thế"
                    folder="general"
                    usageType="auto"
                    value={replacementAsset?.url ?? ""}
                    onChange={(url) => {
                      if (!url) {
                        setReplacementAsset(null);
                        setReplacementId("");
                      }
                    }}
                    onSelectAsset={(sel) => {
                      setReplacementAsset(sel);
                      setReplacementId(sel?.id ?? "");
                    }}
                  />
                </div>

                {replacementAsset ? (
                  <p style={{ fontSize: 12, color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>
                    Đã chọn: {replacementAsset.id}
                  </p>
                ) : replacementId ? (
                  <p style={{ fontSize: 12, color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>
                    Đã lưu trước đó: {replacementId}
                  </p>
                ) : null}

                <details style={{ marginBottom: 12 }} open={showManualReplacementId}>
                  <summary
                    style={{ cursor: "pointer", fontSize: 12, color: "#6b7280" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowManualReplacementId((v) => !v);
                    }}
                  >
                    Nâng cao: nhập Media ID thủ công
                  </summary>
                  <label className="admin-field-hint" style={{ display: "block", marginTop: 8 }}>
                    Replacement asset ID
                    <input
                      className="admin-input"
                      style={{ display: "block", marginTop: 4, maxWidth: 420 }}
                      value={replacementId}
                      onChange={(e) => {
                        setReplacementId(e.target.value);
                        setReplacementAsset(null);
                      }}
                      placeholder="cuid của ảnh ACTIVE"
                    />
                  </label>
                </details>

                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--xs"
                  disabled={busy}
                  onClick={() => void buildPlan()}
                >
                  Build preview plan
                </button>

                {plan ? (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 13 }}>
                      Auto {plan.replaceableAutomatically} · Manual {plan.needsManualReview} · Unsupported{" "}
                      {plan.unsupported} · Blocked {plan.blocked} · Public impact {plan.publicImpact}
                    </p>
                    {plan.warnings.map((w) => (
                      <p key={w} style={{ fontSize: 12, color: "#92400e", margin: "4px 0" }}>
                        ⚠ {w}
                      </p>
                    ))}
                    <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #f3f4f6", padding: 8 }}>
                      {plan.items.map((item) => {
                        const key = refKey(item.referenceType, item.referenceId, item.field);
                        const disabled = item.decision === "UNSUPPORTED" || item.decision === "BLOCKED";
                        return (
                          <label
                            key={key}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "flex-start",
                              fontSize: 12,
                              marginBottom: 6,
                              opacity: disabled ? 0.55 : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={selectedKeys.has(key)}
                              onChange={() => {
                                setSelectedKeys((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  return next;
                                });
                              }}
                            />
                            <span>
                              <strong>{item.referenceType}</strong> {item.referenceLabel} · {humanField(item.field)} ·{" "}
                              {item.decision}
                              {item.publicImpact ? " · PUBLIC" : ""}
                              {item.warning ? ` — ${item.warning}` : ""}
                              <br />
                              <span style={{ color: "#6b7280" }}>
                                Before: {assetId} → After: {plan.replacementAssetId}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={confirmApply}
                        onChange={(e) => setConfirmApply(e.target.checked)}
                      />
                      Tôi xác nhận Apply chỉ trên các tham chiếu đã chọn
                    </label>
                    {plan.publicImpact > 10 ? (
                      <label className="admin-field-hint" style={{ display: "block", marginTop: 8 }}>
                        Gõ REPLACE để xác nhận high-impact
                        <input
                          className="admin-input"
                          style={{ display: "block", marginTop: 4, maxWidth: 220 }}
                          value={highImpactConfirm}
                          onChange={(e) => setHighImpactConfirm(e.target.value)}
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      style={{ marginTop: 12 }}
                      disabled={busy || !confirmApply || selectedKeys.size === 0}
                      onClick={() => void applySelected()}
                    >
                      Apply selected ({selectedKeys.size})
                    </button>
                    {applyResult ? (
                      <p style={{ fontSize: 13, marginTop: 10 }}>
                        Updated {applyResult.updated} · Skipped {applyResult.skipped} · Failed {applyResult.failed} ·
                        Verified {String(applyResult.verified)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* INSIGHTS TAB                                                    */}
          {/* ---------------------------------------------------------------- */}
          {primaryTab === "insights" ? (
            <section style={cardStyle} aria-labelledby="ws-insights-title">
              <h3 id="ws-insights-title" style={{ marginTop: 0 }}>
                Insights
              </h3>
              {secondaryLoading && !similar.length && !better.length ? (
                <SkeletonRows rows={5} />
              ) : null}

              <section style={{ ...cardStyle, padding: 12, marginBottom: 16 }}>
                <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 13 }}>AI Recommendation</h4>
                {suggested || asset.aiProcessingStatus !== "NOT_PROCESSED" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Best for</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(recommended.length ? recommended : ["Chưa có gợi ý"]).map((item) => (
                          <li key={item}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Not recommended</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(notRecommended.length ? notRecommended : ["—"]).map((item) => (
                          <li key={item}>✗ {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>No AI analysis available.</p>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      disabled={busy}
                      onClick={() => void generateSuggestions()}
                    >
                      Generate Analysis
                    </button>
                  </div>
                )}
              </section>

              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { title: "Same Product", items: similar.filter((item) => item.relation === "SAME_PRODUCT"), type: "similar" as const },
                  { title: "Same Session", items: similar.filter((item) => item.relation === "SAME_HASH"), type: "similar" as const },
                  { title: "Higher Resolution", items: better, type: "better" as const },
                  {
                    title: "Portrait",
                    items: [...similar, ...better].filter((item) =>
                      /portrait|vertical/i.test(`${item.title || ""} ${"reason" in item ? item.reason : ""}`),
                    ),
                    type: "mixed" as const,
                  },
                  {
                    title: "Landscape",
                    items: [...similar, ...better].filter((item) =>
                      /landscape|horizontal|banner/i.test(
                        `${item.title || ""} ${"reason" in item ? item.reason : ""}`,
                      ),
                    ),
                    type: "mixed" as const,
                  },
                  { title: "Alternative Hero", items: better.filter((item) => /hero/i.test(item.reason)), type: "better" as const },
                  {
                    title: "Duplicate Candidate",
                    items: similar.filter((item) => item.relation === "DUPLICATE" || item.relation === "SAME_HASH"),
                    type: "similar" as const,
                  },
                ].map((group) => (
                  <div key={group.title}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{group.title}</h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {group.items.map((item) => (
                        <Link
                          key={`${group.title}-${item.mediaAssetId}`}
                          href={`/admin/media/${item.mediaAssetId}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.thumbnailUrl || item.url}
                              alt={("altText" in item && item.altText) || ""}
                              style={{ width: "100%", height: 88, objectFit: "cover" }}
                            />
                            <div style={{ padding: 8, fontSize: 12 }}>
                              <div style={{ color: "#6b7280", fontSize: 11 }}>
                                {"relation" in item
                                  ? humanSimilarRelation(item.relation)
                                  : "reason" in item
                                    ? betterQualityLabel(item)
                                    : "Related"}
                              </div>
                              <div>{item.title || item.mediaAssetId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {!group.items.length ? (
                        <p style={{ margin: 0, color: "#9ca3af", fontSize: 12 }}>No items.</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {!similar.length && !better.length ? (
                <p style={{ color: "#6b7280", fontSize: 13 }}>Chưa có similar / alternative.</p>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Right sidebar */}
        <aside
          style={{ ...cardStyle, position: "sticky", top: 16, display: "grid", gap: 16 }}
          aria-label="Status summary and recommendations"
        >
          <div>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Status</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              <li>Lifecycle: {humanLifecycle(asset.lifecycleStatus)}</li>
              <li>Visibility: {humanVisibility(asset.visibility)}</li>
              <li>Rights: {humanRights(asset.rightsStatus)}</li>
              <li>
                SEO: {asset.seoScore} · {humanSeoReadiness(asset.seoReadinessStatus)}
              </li>
              <li>
                Uses: {useCount} (public {deps?.publicCount ?? "…"})
              </li>
              <li>Bundles: {asset._count.bundleSlotAssets}</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Recommendation</div>
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--xs"
              style={{ marginTop: 6, width: "100%" }}
              onClick={() => setPrimaryTab(resolvePrimaryTab(nextAction?.section || "metadata"))}
            >
              {nextAction?.label || "Review metadata completeness"}
            </button>
          </div>

          {warningChecklist.length ? (
            <div>
              <div style={{ fontSize: 12, color: "#92400e", fontWeight: 600, marginBottom: 6 }}>Warnings</div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 4 }}>
                {warningChecklist.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => setPrimaryTab(w.tab)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#92400e",
                        fontSize: 12,
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      ⚠ {w.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>Insights</div>
            <div style={{ display: "grid", gap: 8 }}>
              {similar.slice(0, 4).map((item) => (
                <button
                  key={`side-${item.mediaAssetId}`}
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => setPrimaryTab("insights")}
                >
                  {humanSimilarRelation(item.relation)}: {item.title || item.mediaAssetId.slice(0, 8)}
                </button>
              ))}
              {!similar.length && !better.length ? (
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Chưa có gợi ý liên quan.</p>
              ) : null}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => setPrimaryTab("metadata")}
              >
                Metadata
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => setPrimaryTab("usage")}
              >
                Usage
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => setPrimaryTab("lifecycle")}
              >
                Lifecycle / Replace
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => {
                  void navigator.clipboard.writeText(asset.id);
                  toast.success("Đã copy Media ID");
                }}
              >
                Copy Media ID
              </button>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .admin-media-workspace-layout > * {
          min-width: 0;
        }
        @media (max-width: 900px) {
          .admin-media-workspace-layout {
            grid-template-columns: 1fr !important;
          }
          .admin-media-workspace-layout aside {
            position: static !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-media-workspace * {
            scroll-behavior: auto !important;
          }
          .admin-media-preview-frame {
            transition: none !important;
          }
        }
        @keyframes ws-skeleton {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
}
