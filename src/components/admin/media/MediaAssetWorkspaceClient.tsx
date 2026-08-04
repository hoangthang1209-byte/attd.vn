"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
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
  PREVIEW_MODES,
  buildUsageTree,
  cardStyle,
  formatBytes,
  healthColor,
  healthGradeLabel,
  humanAiStatus,
  humanDuplicate,
  humanField,
  humanHealthIssue,
  humanLifecycle,
  humanLifecycleAction,
  humanRights,
  humanSeoReadiness,
  humanSimilarRelation,
  humanVisibility,
  previewFrameStyle,
  qualityStars,
  relativeTime,
  timelineIcon,
  toUsageCard,
  type PreviewMode,
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

type Section =
  | "overview"
  | "usage"
  | "lifecycle"
  | "replacement"
  | "rights"
  | "timeline"
  | "health"
  | "ai"
  | "similar"
  | "metadata";

const SECTION_NAV: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "health", label: "Health" },
  { id: "usage", label: "Usage" },
  { id: "ai", label: "AI" },
  { id: "metadata", label: "Metadata" },
  { id: "similar", label: "Similar" },
  { id: "timeline", label: "Timeline" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "replacement", label: "Replacement" },
  { id: "rights", label: "Rights" },
];

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

function sectionFromNextAction(
  section: ReturnType<typeof recommendAssetNextAction>["section"],
): Section {
  if (section === "bundles") return "overview";
  return section;
}

export default function MediaAssetWorkspaceClient({ assetId }: { assetId: string }) {
  const toast = useAdminToast();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as Section) || "overview";
  const cardRefs = useRef<Partial<Record<Section, HTMLElement | null>>>({});

  const [section, setSection] = useState<Section>(
    SECTION_NAV.some((s) => s.id === initialSection) ? initialSection : "overview",
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

  const [replacementId, setReplacementId] = useState("");
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

  const scrollToSection = useCallback((id: Section) => {
    setSection(id);
    const el = cardRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus({ preventScroll: true });
    }
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
    if (section === "usage" || section === "replacement") void loadDeps();
  }, [section, loadDeps]);

  useEffect(() => {
    if (!loading && asset) {
      const t = window.setTimeout(() => scrollToSection(section), 100);
      return () => window.clearTimeout(t);
    }
    // only on first load with deep-link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

  const warnings = useMemo(() => {
    if (!asset) return [] as string[];
    const list: string[] = [];
    if (!asset.altText?.trim()) list.push("Thiếu alt text — ảnh công khai kém accessibility.");
    if (asset.rightsStatus === "UNKNOWN" && asset.visibility === "PUBLIC") {
      list.push("Quyền sử dụng chưa rõ trên ảnh PUBLIC.");
    }
    if (asset.duplicateStatus === "CONFIRMED_DUPLICATE" || asset.duplicateStatus === "POSSIBLE_DUPLICATE") {
      list.push(`Trùng lặp: ${humanDuplicate(asset.duplicateStatus)}.`);
    }
    if (deps && deps.publicCount > 0 && asset.lifecycleStatus === "DEPRECATED") {
      list.push(`DEPRECATED nhưng còn ${deps.publicCount} chỗ dùng công khai.`);
    }
    if ((asset.seoScore ?? 0) < 50) list.push("SEO score thấp — cần bổ sung metadata.");
    return list;
  }, [asset, deps]);

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
      toast.error("Nhập ID ảnh thay thế");
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
      scrollToSection("replacement");
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
  const recommended = suggested?.suggestedSuitabilities?.slice(0, 6) ?? asset?.contentSuitabilities ?? [];
  const notRecommended =
    suggested && (asset?.width ?? 0) < 1200
      ? ["Homepage Hero"]
      : [];

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
  const openProduct = usageCards.find((c) => c.moduleLabel === "Sản phẩm" && c.href);
  const openBlog = usageCards.find((c) => c.moduleLabel === "Blog" && c.href);
  const openHomepage = usageCards.find((c) => c.moduleLabel === "Trang chủ" && c.href);

  return (
    <div className="admin-media-workspace">
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
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          padding: 12,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          disabled={busy}
          onClick={() => void generateSuggestions()}
        >
          Generate Alt / Caption
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          onClick={() => scrollToSection("replacement")}
        >
          Replace
        </button>
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
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          disabled={busy || asset.lifecycleStatus === "ARCHIVED"}
          onClick={() => {
            scrollToSection("lifecycle");
            setReason((r) => r || "Archive from workspace");
          }}
        >
          Archive
        </button>
        {openProduct?.href ? (
          <Link href={openProduct.href} className="admin-btn admin-btn--secondary admin-btn--xs">
            Open Product
          </Link>
        ) : null}
        {openBlog?.href ? (
          <Link href={openBlog.href} className="admin-btn admin-btn--secondary admin-btn--xs">
            Open Blog
          </Link>
        ) : null}
        {openHomepage?.href ? (
          <Link href={openHomepage.href} className="admin-btn admin-btn--secondary admin-btn--xs">
            Open Homepage
          </Link>
        ) : null}
      </div>

      <div className="admin-media-workspace-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          {/* Hero preview + header */}
          <section
            ref={(el) => {
              cardRefs.current.overview = el;
            }}
            tabIndex={-1}
            id="ws-overview"
            aria-label="Asset preview"
            style={cardStyle}
          >
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
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.altText || asset.title || asset.filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>
              {asset.title || asset.filename}
            </h2>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{asset.filename}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>
              ID {asset.id}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
                alignItems: "center",
              }}
              aria-label="Asset status badges"
            >
              <span style={{ letterSpacing: 1, color: "#a16207" }} aria-label={`Quality ${qualityStars(asset.seoScore)}`}>
                {qualityStars(asset.seoScore)}
              </span>
              <span className="admin-badge">{humanLifecycle(asset.lifecycleStatus)}</span>
              <span className="admin-badge">{humanVisibility(asset.visibility)}</span>
              <span className="admin-badge">SEO {asset.seoScore}</span>
              <span className="admin-badge">
                Quality {health ? healthGradeLabel(health.grade) : "—"}
              </span>
              <span className="admin-badge">Used by {useCount}</span>
              <span className="admin-badge">{asset.orientation}</span>
              {asset.role?.name ? <span className="admin-badge">{asset.role.name}</span> : null}
              {asset.subjectTerms.slice(0, 2).map((t) => (
                <span key={t} className="admin-badge">
                  {t}
                </span>
              ))}
              {asset.techniqueTerms?.slice(0, 2).map((t) => (
                <span key={t} className="admin-badge">
                  {t}
                </span>
              ))}
              <span className="admin-badge">{humanAiStatus(asset.aiProcessingStatus)}</span>
              <span className="admin-badge">{humanSeoReadiness(asset.seoReadinessStatus)}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 14, fontSize: 13 }}>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>Dimensions</div>
                <div>{asset.width || "?"}×{asset.height || "?"}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>Size</div>
                <div>{formatBytes(asset.sizeBytes)}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>Role</div>
                <div>{asset.role?.name || "—"}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>Library</div>
                <div>{asset.library?.name || "—"}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>Completeness</div>
                <div>{asset.metadataCompleteness}%</div>
              </div>
            </div>
          </section>

          <nav
            aria-label="Workspace sections"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {SECTION_NAV.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`admin-btn admin-btn--xs ${section === s.id ? "admin-btn--primary" : "admin-btn--secondary"}`}
                aria-current={section === s.id ? "true" : undefined}
                onClick={() => scrollToSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Health */}
          <section
            ref={(el) => {
              cardRefs.current.health = el;
            }}
            tabIndex={-1}
            id="ws-health"
            style={cardStyle}
            aria-labelledby="ws-health-title"
          >
            <h3 id="ws-health-title" style={{ marginTop: 0 }}>
              Health
            </h3>
            {secondaryLoading && !health ? <InlineLoading title="Đang tải health…" /> : null}
            {health ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: healthColor(health.total) }}>
                    {health.total}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>Overall Health · {healthGradeLabel(health.grade)}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Completeness {asset.metadataCompleteness}%
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  {(
                    [
                      ["SEO Score", health.seo],
                      ["Accessibility", health.accessibility],
                      ["Resolution", health.resolution],
                      ["Alt", health.alt],
                      ["Caption", health.caption],
                      ["Crop", health.crop],
                      ["Duplicate", health.duplicate],
                      ["Visibility", health.visibility],
                      ["Bundle", health.bundle],
                      ["Suitability", health.suitability],
                      ["Usage", health.usage],
                    ] as const
                  ).map(([label, score]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                      <div style={{ fontWeight: 600, color: healthColor(score) }}>{score}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div>
                    <strong>Duplicate status:</strong> {humanDuplicate(asset.duplicateStatus)}
                  </div>
                  <div>
                    <strong>Color profile:</strong> {asset.dominantColor || "—"}
                  </div>
                  <div>
                    <strong>Aspect:</strong> {asset.orientation}
                    {asset.width && asset.height
                      ? ` · ${(asset.width / asset.height).toFixed(2)}`
                      : ""}
                  </div>
                  {health.issues.length ? (
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {health.issues.map((issue) => (
                        <li key={issue}>{humanHealthIssue(issue)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "#15803d", marginBottom: 0 }}>Không có vấn đề lớn.</p>
                  )}
                </div>
              </>
            ) : (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Health sẽ hiển thị sau khi tải panel phụ.</p>
            )}
          </section>

          {/* Usage */}
          <section
            ref={(el) => {
              cardRefs.current.usage = el;
            }}
            tabIndex={-1}
            id="ws-usage"
            style={cardStyle}
            aria-labelledby="ws-usage-title"
          >
            <h3 id="ws-usage-title" style={{ marginTop: 0 }}>
              Usage
            </h3>
            {depsLoading && !deps ? <InlineLoading title="Đang tải usage…" /> : null}
            {deps ? (
              <>
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  Total {deps.total} · Public {deps.publicCount} · Internal {deps.internalCount} ·
                  Replaceable {deps.replaceableCount}
                </p>
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {usageCards.map((card) => (
                    <article
                      key={card.key}
                      style={{
                        border: "1px solid #f3f4f6",
                        borderRadius: 8,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>
                        {card.moduleLabel}
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>{card.title}</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        {card.placement} ·{" "}
                        <span style={{ color: card.statusTone === "public" ? "#15803d" : "#6b7280" }}>
                          {card.statusLabel}
                        </span>
                      </div>
                      {card.href ? (
                        <Link
                          href={card.href}
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          style={{ marginTop: 8, display: "inline-flex" }}
                        >
                          Open →
                        </Link>
                      ) : null}
                    </article>
                  ))}
                  {usageCards.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>Chưa có tham chiếu đã biết.</p>
                  ) : null}
                </div>

                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Usage graph</h4>
                <pre
                  aria-label="Usage dependency tree"
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    padding: 12,
                    overflow: "auto",
                  }}
                >
                  {`Media\n${usageTree
                    .map((mod, mi) => {
                      const branch = mi === usageTree.length - 1 ? "└──" : "├──";
                      const childPad = mi === usageTree.length - 1 ? "    " : "│   ";
                      const children = mod.children
                        .map((ch, ci) => {
                          const cBranch = ci === mod.children.length - 1 ? "└──" : "├──";
                          return `${childPad}${cBranch} ${ch.field}: ${ch.label}`;
                        })
                        .join("\n");
                      return `${branch} ${mod.label}\n${children}`;
                    })
                    .join("\n")}`}
                </pre>
              </>
            ) : null}
          </section>

          {/* AI Recommendations */}
          <section
            ref={(el) => {
              cardRefs.current.ai = el;
            }}
            tabIndex={-1}
            id="ws-ai"
            style={cardStyle}
            aria-labelledby="ws-ai-title"
          >
            <h3 id="ws-ai-title" style={{ marginTop: 0 }}>
              AI Recommendations
            </h3>
            <div style={{ fontSize: 20, color: "#a16207", marginBottom: 8 }}>
              {qualityStars(suggested?.confidence ? suggested.confidence * 100 : asset.seoScore)}
            </div>
            <p style={{ fontSize: 13, marginTop: 0 }}>
              AI thinks · Confidence{" "}
              {suggested?.confidence != null
                ? `${Math.round(suggested.confidence * 100)}%`
                : "—"}{" "}
              · {humanAiStatus(asset.aiProcessingStatus)}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Best usage</div>
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
                {notRecommended.length ? (
                  <p style={{ color: "#92400e", fontSize: 12 }}>
                    Reason: độ phân giải có thể thấp cho hero.
                  </p>
                ) : null}
              </div>
            </div>
            {suggested ? (
              <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                Suggested title: {suggested.title || "—"} · Alt: {suggested.altText || "—"}
              </div>
            ) : null}
          </section>

          {/* Metadata Assistant */}
          <section
            ref={(el) => {
              cardRefs.current.metadata = el;
            }}
            tabIndex={-1}
            id="ws-metadata"
            style={cardStyle}
            aria-labelledby="ws-metadata-title"
          >
            <h3 id="ws-metadata-title" style={{ marginTop: 0 }}>
              Metadata Assistant
            </h3>
            <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", fontSize: 13 }}>
              <dt>Title</dt>
              <dd style={{ margin: 0 }}>
                {asset.title || <span style={{ color: "#b91c1c" }}>Missing</span>}
                {!asset.title && suggested?.title ? (
                  <span style={{ color: "#6b7280" }}> · AI: {suggested.title}</span>
                ) : null}
              </dd>
              <dt>Alt</dt>
              <dd style={{ margin: 0 }}>
                {asset.altText || <span style={{ color: "#b91c1c" }}>Missing</span>}
                {!asset.altText && suggested?.altText ? (
                  <span style={{ color: "#6b7280" }}> · AI: {suggested.altText}</span>
                ) : null}
              </dd>
              <dt>Caption</dt>
              <dd style={{ margin: 0 }}>
                {asset.caption || <span style={{ color: "#b91c1c" }}>Missing</span>}
                {!asset.caption && suggested?.caption ? (
                  <span style={{ color: "#6b7280" }}> · AI: {suggested.caption}</span>
                ) : null}
              </dd>
              <dt>Keywords</dt>
              <dd style={{ margin: 0 }}>
                {(asset.keywords && asset.keywords.length > 0
                  ? asset.keywords.join(", ")
                  : null) || <span style={{ color: "#b91c1c" }}>Missing</span>}
              </dd>
              <dt>Subjects</dt>
              <dd style={{ margin: 0 }}>{asset.subjectTerms.join(", ") || "—"}</dd>
              <dt>Collections / Bundles</dt>
              <dd style={{ margin: 0 }}>
                {asset._count.collections} / {asset._count.bundleSlotAssets}
              </dd>
            </dl>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
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
            <p className="admin-field-hint" style={{ marginBottom: 0 }}>
              Không tự áp dụng — editor phải Approve / Apply.
            </p>
          </section>

          {/* Similar assets */}
          <section
            ref={(el) => {
              cardRefs.current.similar = el;
            }}
            tabIndex={-1}
            id="ws-similar"
            style={cardStyle}
            aria-labelledby="ws-similar-title"
          >
            <h3 id="ws-similar-title" style={{ marginTop: 0 }}>
              Similar & Alternatives
            </h3>
            {secondaryLoading && !similar.length && !better.length ? (
              <InlineLoading title="Đang tải related assets…" />
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {asset.supersedesAssetId ? (
                <Link href={`/admin/media/${asset.supersedesAssetId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Previous version</div>
                    <div style={{ fontSize: 12 }}>Open →</div>
                  </div>
                </Link>
              ) : null}
              {asset.replacementAssetId ? (
                <Link href={`/admin/media/${asset.replacementAssetId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Next / Replacement</div>
                    <div style={{ fontSize: 12 }}>Open →</div>
                  </div>
                </Link>
              ) : null}
              {better.map((item) => (
                <Link
                  key={`better-${item.mediaAssetId}`}
                  href={`/admin/media/${item.mediaAssetId}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt=""
                      style={{ width: "100%", height: 88, objectFit: "cover" }}
                    />
                    <div style={{ padding: 8, fontSize: 12 }}>
                      <div style={{ color: "#6b7280", fontSize: 11 }}>Higher quality</div>
                      <div>{item.title || item.mediaAssetId.slice(0, 8)}</div>
                      <div style={{ color: "#6b7280" }}>{item.reason}</div>
                    </div>
                  </div>
                </Link>
              ))}
              {similar.map((item) => (
                <Link
                  key={item.mediaAssetId}
                  href={`/admin/media/${item.mediaAssetId}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.altText || ""}
                      style={{ width: "100%", height: 88, objectFit: "cover" }}
                    />
                    <div style={{ padding: 8, fontSize: 12 }}>
                      <div style={{ color: "#6b7280", fontSize: 11 }}>
                        {humanSimilarRelation(item.relation)}
                      </div>
                      <div>{item.title || item.mediaAssetId.slice(0, 8)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {!similar.length && !better.length && !asset.replacementAssetId && !asset.supersedesAssetId ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Chưa có similar / alternative.</p>
            ) : null}
          </section>

          {/* Timeline */}
          <section
            ref={(el) => {
              cardRefs.current.timeline = el;
            }}
            tabIndex={-1}
            id="ws-timeline"
            style={cardStyle}
            aria-labelledby="ws-timeline-title"
          >
            <h3 id="ws-timeline-title" style={{ marginTop: 0 }}>
              Timeline
            </h3>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {mergedTimeline.map((row) => (
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
                      background: "#f3f4f6",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {row.icon}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.summary}</div>
                    {row.detail ? (
                      <div style={{ color: "#6b7280" }}>{row.detail}</div>
                    ) : null}
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {new Date(row.at).toLocaleString()} · {relativeTime(row.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Lifecycle — preserved */}
          <section
            ref={(el) => {
              cardRefs.current.lifecycle = el;
            }}
            tabIndex={-1}
            id="ws-lifecycle"
            style={cardStyle}
            aria-labelledby="ws-lifecycle-title"
          >
            <h3 id="ws-lifecycle-title" style={{ marginTop: 0 }}>
              Lifecycle
            </h3>
            <p style={{ fontSize: 13 }}>
              Status: <strong>{humanLifecycle(asset.lifecycleStatus)}</strong> ({asset.lifecycleStatus})
              {asset.lifecycleReason ? ` — ${asset.lifecycleReason}` : ""}
            </p>
            {deps && deps.publicCount > 0 ? (
              <p style={{ fontSize: 13, color: "#92400e" }}>
                Ảnh đang được sử dụng tại {deps.publicCount} vị trí công khai. Lưu trữ không làm mất ảnh
                hiện tại, nhưng ảnh sẽ không còn được đề xuất cho nội dung mới.
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

          {/* Replacement — preserved */}
          <section
            ref={(el) => {
              cardRefs.current.replacement = el;
            }}
            tabIndex={-1}
            id="ws-replacement"
            style={cardStyle}
            aria-labelledby="ws-replacement-title"
          >
            <h3 id="ws-replacement-title" style={{ marginTop: 0 }}>
              Replacement
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Preview bắt buộc trước Apply. Không tự động thay thế. Không copy/move file.
            </p>
            <label className="admin-field-hint" style={{ display: "block", marginBottom: 8 }}>
              Replacement asset ID
              <input
                className="admin-input"
                style={{ display: "block", marginTop: 4, maxWidth: 420 }}
                value={replacementId}
                onChange={(e) => setReplacementId(e.target.value)}
                placeholder="cuid của ảnh ACTIVE"
              />
            </label>
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
                          <strong>{item.referenceType}</strong> {item.referenceLabel} ·{" "}
                          {humanField(item.field)} · {item.decision}
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
                    Updated {applyResult.updated} · Skipped {applyResult.skipped} · Failed{" "}
                    {applyResult.failed} · Verified {String(applyResult.verified)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Rights — preserved */}
          <section
            ref={(el) => {
              cardRefs.current.rights = el;
            }}
            tabIndex={-1}
            id="ws-rights"
            style={cardStyle}
            aria-labelledby="ws-rights-title"
          >
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
              <p style={{ fontSize: 13, color: "#92400e" }}>
                Unknown rights trên ảnh PUBLIC — cần editor review.
              </p>
            ) : null}
          </section>
        </div>

        {/* Right sidebar */}
        <aside
          style={{
            ...cardStyle,
            position: "sticky",
            top: 16,
            display: "grid",
            gap: 16,
          }}
          aria-label="Status summary and recommendations"
        >
          <div>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Status Summary</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              <li>Lifecycle: {humanLifecycle(asset.lifecycleStatus)}</li>
              <li>Visibility: {humanVisibility(asset.visibility)}</li>
              <li>Rights: {humanRights(asset.rightsStatus)}</li>
              <li>SEO: {asset.seoScore} · {humanSeoReadiness(asset.seoReadinessStatus)}</li>
              <li>Uses: {useCount} (public {deps?.publicCount ?? "…"})</li>
              <li>Bundles: {asset._count.bundleSlotAssets}</li>
            </ul>
          </div>

          {nextAction ? (
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Next Recommended Action</div>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--xs"
                style={{ marginTop: 6, width: "100%" }}
                onClick={() => scrollToSection(sectionFromNextAction(nextAction.section))}
              >
                {nextAction.label}
              </button>
            </div>
          ) : null}

          {warnings.length ? (
            <div>
              <div style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>Warnings</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>
              Related Assets
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {similar.slice(0, 4).map((item) => (
                <Link
                  key={`side-${item.mediaAssetId}`}
                  href={`/admin/media/${item.mediaAssetId}`}
                  style={{ display: "flex", gap: 8, textDecoration: "none", color: "inherit", fontSize: 12 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
                  />
                  <span>
                    <span style={{ color: "#6b7280" }}>{humanSimilarRelation(item.relation)}</span>
                    <br />
                    {item.title || item.mediaAssetId.slice(0, 10)}
                  </span>
                </Link>
              ))}
              {better.slice(0, 2).map((item) => (
                <Link
                  key={`side-better-${item.mediaAssetId}`}
                  href={`/admin/media/${item.mediaAssetId}`}
                  style={{ display: "flex", gap: 8, textDecoration: "none", color: "inherit", fontSize: 12 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
                  />
                  <span>
                    <span style={{ color: "#6b7280" }}>Higher quality</span>
                    <br />
                    {item.title || item.mediaAssetId.slice(0, 10)}
                  </span>
                </Link>
              ))}
              {!similar.length && !better.length ? (
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Chưa có gợi ý liên quan.</p>
              ) : null}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>
              Quick Actions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => scrollToSection("metadata")}
              >
                Metadata
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => scrollToSection("replacement")}
              >
                Replace
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => scrollToSection("usage")}
              >
                Usage
              </button>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .admin-media-workspace-layout {
            grid-template-columns: 1fr !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-media-workspace * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
