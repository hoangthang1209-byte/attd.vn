"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import ProposalDiffView from "@/components/admin/content/ai-writing/ProposalDiffView";
import PanelSkeleton from "@/components/ui/loading/PanelSkeleton";

type ProposalTimelinePoint = {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
};

type RollbackSnapshot = {
  draftId: string;
  sectionId: string;
  previousHtml: string | null;
  previousPlainText: string | null;
  previousVersion: number | null;
  capturedAt: string;
};

type ProposalDisplay = {
  heading: string | null;
  html: string | null;
  plainText: string | null;
  factIds: string[];
  mediaIds: string[];
  linkIds: string[];
  warnings: string[];
  why: Array<{ label: string; sourceLabel?: string }>;
  items?: unknown[];
};

type ProposalDetail = {
  id: string;
  type: string;
  status: string;
  proposalStatus: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  entityType: string;
  entityId: string;
  sectionId: string | null;
  writingDraftId: string | null;
  writingPlanId: string | null;
  contextBuildId: string | null;
  templateId: string | null;
  templateVersion: string | null;
  factIdsUsed: unknown;
  mediaIdsUsed: unknown;
  warnings: unknown;
  errorMessage: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
  };
  requestedBy: string | null;
  appliedAt: string | null;
  appliedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  output: unknown;
  inputSummary: unknown;
  display: ProposalDisplay;
  latencyMs: number | null;
  timeline: ProposalTimelinePoint[];
  rollbackAvailable: boolean;
  rollbackSnapshot: RollbackSnapshot | null;
  selection: unknown;
  retryOfRunId: string | null;
  retriedByRunId: string | null;
};

function statusTone(status: string | null): "neutral" | "info" | "success" | "warning" | "danger" {
  if (!status) return "neutral";
  if (status === "APPLIED" || status === "EDITED_AND_APPLIED") return "success";
  if (status === "REJECTED" || status === "FAILED" || status === "VALIDATION_FAILED") return "danger";
  if (status === "RUNNING" || status === "REQUESTED") return "info";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function fmtCost(v: number | null): string {
  if (v == null) return "—";
  return `$${v.toFixed(4)}`;
}

function fmtMs(v: number | null): string {
  if (v == null) return "—";
  if (v < 1000) return `${v}ms`;
  return `${(v / 1000).toFixed(1)}s`;
}

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleString("vi-VN") : "—";
}

export default function ContentGenerationDetailClient({ runId }: { runId: string }) {
  const toast = useAdminToast();
  const [data, setData] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/content/generation/${runId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không tải được đề xuất.");
      setData(json.proposal as ProposalDetail);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [runId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (path: string) => {
      setPending(true);
      try {
        const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" } });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.message ?? "Thao tác thất bại.");
          return null;
        }
        toast.success(json.message ?? "OK");
        await load();
        return json;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Thao tác thất bại.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [load, toast],
  );

  if (loading) {
    return (
      <div className="admin-panel">
        <PanelSkeleton label="Đang tải đề xuất AI…" lines={4} />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được đề xuất AI"
        description={loadError ?? "Không tìm thấy đề xuất."}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
            <Link href="/admin/content/ai" className="admin-btn admin-btn--secondary">
              Quay lại AI vận hành
            </Link>
          </div>
        }
      />
    );
  }

  const proposedText = data.display.plainText ?? data.display.html ?? "";
  const originalText = data.rollbackSnapshot?.previousPlainText ?? data.rollbackSnapshot?.previousHtml ?? "";
  const canShowDiff = Boolean(proposedText || originalText);

  return (
    <div className="admin-panel">
      <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="admin-field-hint" style={{ margin: 0 }}>
            <Link href="/admin/content/ai">← AI vận hành</Link>
          </p>
          <p style={{ margin: "8px 0 0", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={statusTone(data.proposalStatus)}>{data.proposalStatus ?? data.status}</StatusBadge>
            <span className="admin-field-hint">
              {data.type} · {data.entityType} #{data.entityId.slice(0, 8)}…
              {data.sectionId ? ` · section ${data.sectionId}` : ""}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="secondary"
            onClick={() => void post(`/api/content/generation/${runId}/retry`)}
          >
            Tạo lại (Retry)
          </AdminLoadingButton>
          {data.rollbackAvailable && (
            <AdminLoadingButton
              pending={pending}
              size="small"
              variant="secondary"
              onClick={() => void post(`/api/content/generation/${runId}/rollback`)}
            >
              Khôi phục (Rollback)
            </AdminLoadingButton>
          )}
        </div>
      </div>

      {data.retryOfRunId && (
        <p className="admin-field-hint" style={{ margin: "0 0 12px" }}>
          Tạo lại từ đề xuất{" "}
          <Link href={`/admin/content/generation/${data.retryOfRunId}`}>{data.retryOfRunId.slice(0, 8)}…</Link>
        </p>
      )}
      {data.retriedByRunId && (
        <p className="admin-field-hint" style={{ margin: "0 0 12px" }}>
          Đã có đề xuất tạo lại:{" "}
          <Link href={`/admin/content/generation/${data.retriedByRunId}`}>{data.retriedByRunId.slice(0, 8)}…</Link>
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
          gap: 16,
          alignItems: "start",
        }}
        className="content-review-detail-layout"
      >
        <div style={{ display: "grid", gap: 12 }}>
          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Nội dung</h3>
            {canShowDiff ? (
              <ProposalDiffView originalText={originalText} proposalText={proposedText} />
            ) : (
              <p className="admin-field-hint">Không có nội dung văn bản để hiển thị cho loại đề xuất này.</p>
            )}
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Ngữ cảnh đã dùng</h3>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Fact: {data.display.factIds.length} · Media: {data.display.mediaIds.length} · Link:{" "}
              {data.display.linkIds.length}
            </p>
            {data.display.warnings.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {data.display.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </section>

          {data.errorMessage && (
            <section className="admin-sidebar-card" style={{ margin: 0 }}>
              <h3 className="admin-sidebar-title">Lỗi</h3>
              <p style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>{data.errorMessage}</p>
            </section>
          )}
        </div>

        <div style={{ display: "grid", gap: 12, position: "sticky", top: 12 }}>
          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Provider & chi phí</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, display: "grid", gap: 4 }}>
              <li>Provider: {data.provider} · Model: {data.model}</li>
              <li>Prompt version: {data.promptVersion}</li>
              <li>
                Tokens: {data.usage.totalTokens ?? "—"} (in {data.usage.inputTokens ?? "—"} / out{" "}
                {data.usage.outputTokens ?? "—"})
              </li>
              <li>Chi phí ước tính: {fmtCost(data.usage.estimatedCostUsd)}</li>
              <li>Độ trễ: {fmtMs(data.latencyMs)}</li>
              <li>Yêu cầu bởi: {data.requestedBy ?? "—"}</li>
            </ul>
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Dòng thời gian</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, display: "grid", gap: 6 }}>
              {data.timeline.map((point) => (
                <li key={point.key} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ color: point.done ? "#047857" : "#9ca3af" }}>{point.done ? "✓" : "○"}</span>
                  <span>
                    {point.label}
                    {point.at ? <span className="admin-field-hint"> — {fmtDate(point.at)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Trạng thái áp dụng</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, display: "grid", gap: 4 }}>
              <li>Áp dụng lúc: {fmtDate(data.appliedAt)} {data.appliedBy ? `· bởi ${data.appliedBy}` : ""}</li>
              <li>Từ chối lúc: {fmtDate(data.rejectedAt)} {data.rejectedBy ? `· bởi ${data.rejectedBy}` : ""}</li>
              <li>Có thể khôi phục: {data.rollbackAvailable ? "Có" : "Không"}</li>
            </ul>
            {data.writingDraftId && (
              <p className="admin-field-hint" style={{ marginTop: 8 }}>
                <Link href={`/admin/content/seo-topics/${data.entityId}`}>Mở workspace chủ đề</Link>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
