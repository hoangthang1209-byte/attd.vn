"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import type { MediaDependencySummary, MediaReplacementPlan } from "@/features/media/lifecycle/lifecycle.types";
import { recommendAssetNextAction } from "@/features/media/lifecycle/next-action.service";

type WorkspaceAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  caption: string | null;
  filename: string;
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
  library: { id: string; code: string; name: string } | null;
  role: { id: string; code: string; name: string } | null;
  subjectTerms: string[];
  contentSuitabilities: string[];
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
  | "timeline";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "usage", label: "Usage" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "replacement", label: "Replacement" },
  { id: "rights", label: "Rights" },
  { id: "timeline", label: "Timeline" },
];

function refKey(type: string, id: string, field: string | null) {
  return `${type}:${id}:${field ?? ""}`;
}

export default function MediaAssetWorkspaceClient({ assetId }: { assetId: string }) {
  const toast = useAdminToast();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as Section) || "overview";

  const [section, setSection] = useState<Section>(
    SECTIONS.some((s) => s.id === initialSection) ? initialSection : "overview",
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
  const [loading, setLoading] = useState(true);
  const [depsLoading, setDepsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Replacement flow
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

  const loadAsset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${assetId}`);
      const data = (await res.json()) as WorkspaceAsset & { message?: string };
      if (!res.ok) throw new Error(data.message || "Không tải được asset");
      setAsset(data);
      setReplacementId(data.replacementAssetId ?? "");
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
      /* panel soft-fail */
    }
  }, [assetId]);

  useEffect(() => {
    void loadAsset();
    void loadLifecycle();
  }, [loadAsset, loadLifecycle]);

  useEffect(() => {
    if (section === "usage" || section === "replacement") void loadDeps();
  }, [section, loadDeps]);

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
      const data = (await res.json()) as {
        message?: string;
        code?: string;
        references?: { publicCount?: number };
      };
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
        body: JSON.stringify({ action: "select", replacementAssetId: replacementId.trim(), reason }),
      });
      const res = await fetch(`/api/media/${assetId}/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", replacementAssetId: replacementId.trim() }),
      });
      const data = (await res.json()) as MediaReplacementPlan & { message?: string; code?: string };
      if (!res.ok) {
        toast.error(data.message ?? data.code ?? "Không tạo được plan");
        return;
      }
      setPlan(data);
      const auto = new Set(
        data.items.filter((i) => i.decision === "AUTO").map((i) => refKey(i.referenceType, i.referenceId, i.field)),
      );
      setSelectedKeys(auto);
      setSection("replacement");
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

  return (
    <div className="admin-media-workspace">
      <AdminPageTitle title={asset.title || asset.filename || "Asset Workspace"} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: 20,
          alignItems: "start",
        }}
        className="admin-media-workspace-layout"
      >
        <div>
          <header
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 16,
              marginBottom: 16,
              padding: 14,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.thumbnailUrl || asset.url}
              alt={asset.altText || ""}
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6 }}
            />
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span className="admin-badge">{asset.lifecycleStatus}</span>
                <span className="admin-badge">{asset.visibility}</span>
                <span className="admin-badge">SEO {asset.seoScore}</span>
                {deps ? <span className="admin-badge">Public uses {deps.publicCount}</span> : null}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{asset.filename}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                {asset.width || "?"}×{asset.height || "?"} · {asset.orientation} · {asset.mimeType}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <Link href="/admin/media" className="admin-btn admin-btn--secondary admin-btn--xs">
                  Thư viện
                </Link>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(asset.id);
                    toast.success("Đã copy asset ID");
                  }}
                >
                  Copy ID
                </button>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                >
                  Open URL
                </a>
              </div>
            </div>
          </header>

          <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`admin-btn admin-btn--xs ${section === s.id ? "admin-btn--primary" : "admin-btn--secondary"}`}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {section === "overview" ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Overview</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 12px", fontSize: 13 }}>
                <dt>Title</dt>
                <dd style={{ margin: 0 }}>{asset.title || "—"}</dd>
                <dt>Alt</dt>
                <dd style={{ margin: 0 }}>{asset.altText || "—"}</dd>
                <dt>Caption</dt>
                <dd style={{ margin: 0 }}>{asset.caption || "—"}</dd>
                <dt>Library / Role</dt>
                <dd style={{ margin: 0 }}>
                  {asset.library?.name || "—"} / {asset.role?.name || "—"}
                </dd>
                <dt>Completeness</dt>
                <dd style={{ margin: 0 }}>
                  {asset.metadataCompleteness}% · {asset.seoReadinessStatus} · AI {asset.aiProcessingStatus}
                </dd>
                <dt>Collections / Bundles</dt>
                <dd style={{ margin: 0 }}>
                  {asset._count.collections} / {asset._count.bundleSlotAssets}
                </dd>
                <dt>Subjects</dt>
                <dd style={{ margin: 0 }}>{asset.subjectTerms.join(", ") || "—"}</dd>
              </dl>
            </section>
          ) : null}

          {section === "usage" ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Usage / Dependencies</h3>
              {depsLoading ? <InlineLoading title="Đang tải dependencies…" /> : null}
              {deps ? (
                <>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    Total {deps.total} · Public {deps.publicCount} · Internal {deps.internalCount} ·
                    Replaceable {deps.replaceableCount} · Unsupported {deps.unsupportedCount}
                  </p>
                  {Object.entries(deps.byModule).map(([module, rows]) => (
                    <div key={module} style={{ marginBottom: 14 }}>
                      <h4 style={{ margin: "0 0 6px" }}>{module}</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {rows.map((row) => (
                          <li key={refKey(row.referenceType, row.referenceId, row.field)}>
                            {row.referenceUrl ? (
                              <Link href={row.referenceUrl}>{row.referenceLabel}</Link>
                            ) : (
                              row.referenceLabel
                            )}{" "}
                            · {row.field || "—"} · {row.relationMode}
                            {row.publicImpact ? " · PUBLIC" : " · internal"}
                            {row.replaceable ? "" : " · manual"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {deps.total === 0 ? <p style={{ color: "#6b7280" }}>Chưa có tham chiếu đã biết.</p> : null}
                </>
              ) : null}
            </section>
          ) : null}

          {section === "lifecycle" ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Lifecycle</h3>
              <p style={{ fontSize: 13 }}>
                Status: <strong>{asset.lifecycleStatus}</strong>
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
          ) : null}

          {section === "replacement" ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Replacement</h3>
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
                            <strong>{item.referenceType}</strong> {item.referenceLabel} · {item.field} ·{" "}
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
                      Updated {applyResult.updated} · Skipped {applyResult.skipped} · Failed{" "}
                      {applyResult.failed} · Verified {String(applyResult.verified)}
                    </p>
                  ) : null}
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                    Sau Apply, có thể đánh dấu ảnh cũ DEPRECATED ở tab Lifecycle (không tự động).
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {section === "rights" ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Rights</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 12px", fontSize: 13 }}>
                <dt>Status</dt>
                <dd style={{ margin: 0 }}>{asset.rightsStatus}</dd>
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
          ) : null}

          {section === "timeline" ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Timeline</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                <li>
                  Uploaded {new Date(asset.createdAt).toLocaleString()}
                </li>
                {lifecycleEvents.map((ev) => (
                  <li key={ev.id}>
                    {ev.action} {ev.fromStatus || "—"} → {ev.toStatus || "—"} ·{" "}
                    {new Date(ev.createdAt).toLocaleString()}
                    {ev.reason ? ` — ${ev.reason}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 14,
            background: "#fff",
            position: "sticky",
            top: 16,
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Status summary</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Lifecycle: {asset.lifecycleStatus}</li>
            <li>Visibility: {asset.visibility}</li>
            <li>Rights: {asset.rightsStatus}</li>
            <li>Assignments: {asset._count.contentMediaAssignments}</li>
            <li>Bundles: {asset._count.bundleSlotAssets}</li>
          </ul>
          {nextAction ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Next action</div>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--xs"
                style={{ marginTop: 6 }}
                onClick={() => setSection(nextAction.section === "bundles" ? "overview" : nextAction.section)}
              >
                {nextAction.label}
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .admin-media-workspace-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
