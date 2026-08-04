"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import WritingSectionAiAssistant from "@/components/admin/content/ai-writing/WritingSectionAiAssistant";
import AiEmptyState from "@/components/admin/content/ai-writing/AiEmptyState";
import AiGenerationQueue from "@/components/admin/content/ai-writing/AiGenerationQueue";
import AiHistoryTimeline, { type AiHistoryTimelineItem } from "@/components/admin/content/ai-writing/AiHistoryTimeline";
import InlineTextAiToolbar from "@/components/admin/content/ai-writing/InlineTextAiToolbar";
import { useAiWritingQueue } from "@/components/admin/content/ai-writing/useAiWritingQueue";
import canvasStyles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import {
  deriveSectionEditorialState,
  SECTION_EDITORIAL_STATE_LABELS,
  type SectionEditorialState,
} from "@/features/content/editorial/editorial-ux";

type BuildHistoryItem = {
  id: string;
  status: string;
  purpose: string;
  readinessScore: number | null;
  createdAt: string | Date;
  packageHash: string | null;
};

type PlanSummary = {
  id: string;
  status: string;
  contentType: string;
  planHash: string | null;
  readinessScore: number | null;
  sectionCount: number;
  createdAt: string | Date;
};

type WritingPlanLite = {
  id: string;
  planHash: string;
  version: string;
  contentType: string;
  contextBuildId: string;
  readiness: {
    ready: boolean;
    score: number;
    errors: Array<{ code: string; message: string; severity: string }>;
    warnings: Array<{ code: string; message: string; severity: string }>;
  };
  sections: Array<{
    id: string;
    heading: string;
    type: string;
    targetWordCountMin: number;
    targetWordCountMax: number;
    requiredFactIds: string[];
    optionalFactIds: string[];
    mediaAssetIds: string[];
    internalLinkIds: string[];
    status: string;
  }>;
  factPlan: { unallocatedFactIds: string[]; excludedFactIds: string[] };
  mediaPlan: {
    placements: Array<{ id: string; placement: string; mediaAssetId: string; altText: string }>;
    inlineHints?: {
      requiredIntents: string[];
      recommendedImageCount: number;
      preferredSectionPlacement: string[];
      excludedSectionTypes: string[];
      approvedMediaSources: string[];
    };
  };
  internalLinkPlan: {
    placements: Array<{ id: string; url: string; anchorText: string; sectionId: string }>;
  };
  ctaPlan: { primary: { text: string; destination?: string | null } };
  keywordPlan: { primaryKeyword: string; secondaryKeywords: string[] };
  schemaPlan: { schemaTypes: string[]; faqEnabled: boolean };
  metadataPlan: { metaTitle: string; metaDescription: string; slug: string };
};

type DraftSection = {
  sectionId: string;
  heading: string;
  plainText: string;
  html: string;
  warnings: string[];
  wordCount: number;
};

type DraftLite = {
  id: string;
  status: string;
  isMock?: boolean;
  sections?: DraftSection[];
  qa?: { passed: boolean; score: number; issues: Array<{ code: string; message: string }> };
  rendered?: { html?: string | null; markdown?: string | null };
};

type ProviderStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  configured: boolean;
};

type ContentGenerationSafeStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  keyConfigured: boolean;
};

/** Mirrors `isContentGenerationConfigured` — true only when a real provider can actually run. */
function isAiConfigured(status: ContentGenerationSafeStatus | null): boolean {
  if (!status?.enabled) return false;
  if (status.provider === "test") return true;
  if (status.provider === "openai") return status.keyConfigured;
  return false;
}

type RunStatus = {
  runId: string;
  status: string;
  totalSections: number;
  pending: number;
  running: number;
  generated: number;
  failed: number;
  cancelled: number;
  usage: {
    totalTokens: number | null;
    estimatedCostUsd: number | null;
    latencyMs: number | null;
  };
};

type Props = { topicId: string; canvasMode?: boolean };

const SECTION_STATE_CLASS: Record<SectionEditorialState, string> = {
  empty: canvasStyles.sectionStateEmpty,
  drafting: canvasStyles.sectionStateDrafting,
  needs_attention: canvasStyles.sectionStateNeedsAttention,
  qa_ok: canvasStyles.sectionStateQaOk,
  approved: canvasStyles.sectionStateApproved,
};

export default function WritingEnginePanel({ topicId, canvasMode = false }: Props) {
  const toast = useAdminToast();
  const [contextBuilds, setContextBuilds] = useState<BuildHistoryItem[]>([]);
  const [contextBuildId, setContextBuildId] = useState("");
  const [contentType, setContentType] = useState("SEO_ARTICLE");
  const [building, setBuilding] = useState(false);
  const [plan, setPlan] = useState<WritingPlanLite | null>(null);
  const [planHistory, setPlanHistory] = useState<PlanSummary[]>([]);
  const [draft, setDraft] = useState<DraftLite | null>(null);
  const [openSection, setOpenSection] = useState("readiness");
  const [mockEnabled, setMockEnabled] = useState(false);
  const [cacheHint, setCacheHint] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [contentGenStatus, setContentGenStatus] = useState<ContentGenerationSafeStatus | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [timeline, setTimeline] = useState<Array<{ type: string; message: string; sectionId?: string }>>([]);
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [editSectionId, setEditSectionId] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [draftVersion, setDraftVersion] = useState(1);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [inlinePlanSummary, setInlinePlanSummary] = useState<string | null>(null);
  const [inlinePlanBusy, setInlinePlanBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sprint 16.1 — inline AI writing experience.
  const aiQueue = useAiWritingQueue();
  const [aiHistory, setAiHistory] = useState<AiHistoryTimelineItem[]>([]);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const aiConfigured = isAiConfigured(contentGenStatus);

  const runInlineMediaPlan = useCallback(async () => {
    if (!draft?.id) {
      toast.error("Cần Writing Draft trước khi lập kế hoạch ảnh.");
      return;
    }
    setInlinePlanBusy(true);
    setInlinePlanSummary(null);
    try {
      const res = await fetch("/api/content/media-placement/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writingDraftId: draft.id, topicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không lập được kế hoạch ảnh.");
      const planData = data.plan as {
        targetCount: number;
        proposedCount: number;
        placements: Array<{ section: { heading: string }; score: { total: number } }>;
        gaps: string[];
        warnings: string[];
      };
      const lines = planData.placements.map(
        (row) => `• ${row.section.heading} (score ${row.score.total})`,
      );
      setInlinePlanSummary(
        [
          `Đề xuất ${planData.proposedCount}/${planData.targetCount} ảnh (chỉ xem — áp dụng sau Handoff Blog).`,
          ...lines,
          ...(planData.gaps.slice(0, 3) ?? []),
          ...(planData.warnings.slice(0, 2) ?? []),
        ].join("\n"),
      );
      toast.success("Đã lập kế hoạch ảnh nội dung (chưa áp dụng).");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi lập kế hoạch ảnh.");
    } finally {
      setInlinePlanBusy(false);
    }
  }, [draft?.id, topicId, toast]);

  const loadBuilds = useCallback(async () => {
    const res = await fetch(`/api/content/seo/topics/${topicId}/context-builds`);
    const data = await res.json();
    if (res.ok) {
      const builds = (data.builds as BuildHistoryItem[]).filter((b) => b.status === "COMPLETED");
      setContextBuilds(builds);
      if (!contextBuildId && builds[0]) setContextBuildId(builds[0].id);
    }
  }, [topicId, contextBuildId]);

  const loadPlans = useCallback(async () => {
    const res = await fetch(`/api/content/seo/topics/${topicId}/writing-plans`);
    const data = await res.json();
    if (res.ok) {
      setPlanHistory((data.plans as PlanSummary[]) ?? []);
      setMockEnabled(Boolean(data.mockEnabled));
    }
  }, [topicId]);

  const loadProviderStatus = useCallback(async () => {
    const res = await fetch("/api/content/writing-generation/status");
    const data = await res.json();
    if (res.ok) setProviderStatus(data.providerStatus as ProviderStatus);
  }, []);

  const loadContentGenerationStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/content/generation/status");
      const data = await res.json();
      if (res.ok) setContentGenStatus(data.status?.contentGeneration as ContentGenerationSafeStatus);
    } catch {
      // Non-critical status widget — safe to ignore fetch failures here.
    }
  }, []);

  useEffect(() => {
    void loadBuilds();
    void loadPlans();
    void loadProviderStatus();
    void loadContentGenerationStatus();
  }, [loadBuilds, loadPlans, loadProviderStatus, loadContentGenerationStatus]);

  const loadAiHistory = useCallback(async () => {
    const query = draft?.id ? `writingDraftId=${draft.id}` : `topicId=${topicId}`;
    try {
      const res = await fetch(`/api/content/generation/history?${query}&limit=20`);
      const data = await res.json();
      if (res.ok) setAiHistory((data.items as AiHistoryTimelineItem[]) ?? []);
    } catch {
      // History timeline is a convenience view — safe to ignore fetch failures here.
    }
  }, [draft?.id, topicId]);

  useEffect(() => {
    void loadAiHistory();
  }, [loadAiHistory]);

  /**
   * After an AI proposal is applied to a section, re-runs QA against the
   * already-persisted draft (same governed path as the "Full QA" button) to
   * pull the latest section HTML/qa issues back into local state — the AI
   * apply endpoint itself only returns {writingDraftId, sectionId, version}.
   */
  const reloadDraftAfterAi = useCallback(async () => {
    if (!draft?.id) return;
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/qa`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDraft(data.draft as DraftLite);
        setDraftVersion((v) => v + 1);
      }
    } catch {
      // Best-effort refresh — the AI apply itself already succeeded server-side.
    }
    void loadAiHistory();
  }, [draft?.id, loadAiHistory]);

  const runInlineTextAiRewrite = useCallback(
    async (instruction: string, selectedText: string) => {
      if (!draft?.id || !plan?.id || !editSectionId) return;
      if (!aiConfigured) {
        toast.info("AI chưa được cấu hình. Bạn vẫn có thể chỉnh sửa nội dung thủ công.");
        return;
      }
      setBuilding(true);
      try {
        const res = await fetch("/api/content/generation/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "SECTION_REWRITE",
            topicId,
            writingPlanId: plan.id,
            writingDraftId: draft.id,
            sectionId: editSectionId,
            contextBuildId: contextBuildId || null,
            editorInstruction: `${instruction} Đoạn cần áp dụng: "${selectedText}"`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "AI rewrite thất bại.");
        const output = data.proposal?.output as { html?: string; plainText?: string } | undefined;
        const replacement = output?.plainText ?? output?.html ?? "";
        if (replacement && editHtml.includes(selectedText)) {
          setEditHtml(editHtml.replace(selectedText, replacement));
          toast.success("Đã thay đoạn được chọn — bấm Lưu & khóa để áp dụng.");
        } else {
          toast.info("AI đã tạo đề xuất nhưng không khớp đoạn đã chọn để thay tự động.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "AI rewrite thất bại.");
      } finally {
        setBuilding(false);
      }
    },
    [aiConfigured, contextBuildId, draft?.id, editHtml, editSectionId, plan?.id, toast, topicId],
  );

  useEffect(() => {
    if (!activeRunId) return;
    const poll = async () => {
      const res = await fetch(`/api/content/writing-generation-runs/${activeRunId}/status`);
      const data = await res.json();
      if (!res.ok) return;
      setRunStatus(data.status as RunStatus);
      setTimeline((data.timeline as typeof timeline) ?? []);
      const st = (data.status as RunStatus).status;
      if (["COMPLETED", "FAILED", "CANCELLED", "PARTIAL"].includes(st)) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setActiveRunId(null);
      }
    };
    void poll();
    pollRef.current = setInterval(() => void poll(), 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeRunId]);

  async function buildPlan(forceRebuild = false) {
    if (!contextBuildId) {
      toast.error("Chọn Context Build đã hoàn thành");
      return;
    }
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/writing-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextBuildId, contentType, forceRebuild }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo plan");
      setPlan(data.plan as WritingPlanLite);
      setCacheHint(Boolean(data.cacheHint));
      setDraft(null);
      toast.success(data.cacheHint ? "Cache hit — Writing Plan." : "Đã tạo Writing Plan.");
      await loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Build plan thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function createDraftShell() {
    if (!plan?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-plans/${plan.id}/create-draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo draft");
      setDraft(data.draft as DraftLite);
      setDraftVersion(1);
      toast.success("Draft shell trống.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tạo draft thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function generate(mode: "ALL" | "SELECTED" | "FAILED_ONLY" | "UNLOCKED_ONLY", regenerate = false) {
    if (!plan?.id || !draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-plans/${plan.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          mode,
          sectionIds: selectedSectionIds,
          regenerate,
          confirmLockedOverwrite: false,
        }),
      });
      const data = await res.json();
      if (data.providerStatus) setProviderStatus(data.providerStatus);
      if (!res.ok) throw new Error(data.message ?? "Generation thất bại");
      setDraft(data.draft as DraftLite);
      setActiveRunId(data.run?.id ?? null);
      setTimeline(data.events ?? []);
      toast.success("Generation hoàn tất — không tạo Blog.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function generateOne(sectionId: string, action: "generate" | "retry" | "regenerate") {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(
        `/api/content/writing-drafts/${draft.id}/sections/${sectionId}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmLockedOverwrite: locks[sectionId] === true && action === "regenerate" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Thất bại");
      setDraft(data.draft as DraftLite);
      setActiveRunId(data.run?.id ?? null);
      toast.success(`Section ${action} xong`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function toggleLock(sectionId: string, lock: boolean) {
    if (!draft?.id) return;
    const path = lock ? "lock" : "unlock";
    const res = await fetch(`/api/content/writing-drafts/${draft.id}/sections/${sectionId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "MANUAL_LOCK" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message ?? "Lock failed");
      return;
    }
    const next: Record<string, boolean> = {};
    for (const l of data.locks ?? []) {
      if (l.locked) next[l.sectionId] = true;
    }
    setLocks(next);
    toast.success(lock ? "Đã khóa section" : "Đã mở khóa");
  }

  async function saveEdit() {
    if (!draft?.id || !editSectionId) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/sections/${editSectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: editHtml, lockAfterSave: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Save failed");
      setDraft(data.draft as DraftLite);
      setDraftVersion(data.version ?? draftVersion + 1);
      setLocks((prev) => ({ ...prev, [editSectionId]: true }));
      toast.success("Đã lưu & khóa section (human edited)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBuilding(false);
    }
  }

  async function cancelRun() {
    if (!activeRunId) return;
    const res = await fetch(`/api/content/writing-generation-runs/${activeRunId}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) toast.error(data.message ?? "Cancel failed");
    else toast.info("Đã hủy run");
  }

  async function runQa() {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/qa`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "QA thất bại");
      setDraft(data.draft as DraftLite);
      toast.info(data.qa.passed ? "QA passed" : "QA có vấn đề");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "QA thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function renderPreview() {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Render thất bại");
      setDraft(data.draft as DraftLite);
      toast.success("Đã render preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Render thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function startReview() {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/reviews`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Không thể bắt đầu review");
      const review = data.review as { id?: string; status?: string } | undefined;
      if (review?.id) {
        setActiveReviewId(review.id);
        setReviewStatus(review.status ?? "IN_REVIEW");
      }
      toast.success("Đã mở review workspace — chưa approve / chưa tạo Blog.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Start review thất bại");
    } finally {
      setBuilding(false);
    }
  }

  function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const open = openSection === id;
    return (
      <div className="admin-sidebar-card" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => setOpenSection(open ? "" : id)}
        >
          {open ? "Thu gọn" : "Mở"} · {title}
        </button>
        {open ? <div style={{ marginTop: 8 }}>{children}</div> : null}
      </div>
    );
  }

  function sectionBadge(sectionId: string): string {
    if (locks[sectionId]) return "Locked";
    const s = draft?.sections?.find((x) => x.sectionId === sectionId);
    if (!s || !s.plainText.trim()) return "Planned";
    if (s.warnings?.includes("USER_EDITED")) return "Human edited";
    if (draft?.status === "REVIEW_READY") return "Review ready";
    if (s.warnings?.length) return "Generated*";
    return "AI generated";
  }

  /** Never marks a section "approved" without a real, already-persisted review approval. */
  function sectionEditorialState(sectionId: string): SectionEditorialState {
    const s = draft?.sections?.find((x) => x.sectionId === sectionId);
    return deriveSectionEditorialState({
      hasHtml: Boolean(s?.html?.trim()),
      wordCount: s?.wordCount,
      qaFailed: draft?.qa ? !draft.qa.passed : undefined,
      reviewApproved: reviewStatus === "APPROVED" ? true : undefined,
    });
  }

  const contentSetupFields = (
    <>
      <p className="admin-field-hint">
        Provider: {providerStatus
          ? `${providerStatus.provider}/${providerStatus.model} · ${
              providerStatus.configured ? "sẵn sàng" : providerStatus.enabled ? "thiếu key" : "tắt"
            }`
          : "…"}
      </p>

      <div className="admin-field">
        <label className="admin-label">Context Build</label>
        <select className="admin-input" value={contextBuildId} onChange={(e) => setContextBuildId(e.target.value)}>
          <option value="">— Chọn —</option>
          {contextBuilds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id.slice(0, 8)}… · {b.purpose}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <label className="admin-label">Content type</label>
        <select className="admin-input" value={contentType} onChange={(e) => setContentType(e.target.value)}>
          <option value="SEO_ARTICLE">SEO_ARTICLE</option>
          <option value="LANDING_PAGE">LANDING_PAGE</option>
          <option value="PRODUCT_GUIDE">PRODUCT_GUIDE</option>
          <option value="CASE_STUDY">CASE_STUDY</option>
          <option value="KNOWLEDGE_ARTICLE">KNOWLEDGE_ARTICLE</option>
        </select>
      </div>

      <AdminLoadingButton pending={building} variant="primary" size="small" onClick={() => void buildPlan(false)}>
        Tạo Writing Plan
      </AdminLoadingButton>

      {planHistory.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p className="admin-field-hint" style={{ fontWeight: 600, marginBottom: 4 }}>
            Plan history
          </p>
          <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
            {planHistory.slice(0, 6).map((p) => (
              <li key={p.id}>
                {p.id.slice(0, 8)}… · {p.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <div className={canvasMode ? canvasStyles.canvasBlockSoft : "admin-sidebar-card"} style={{ marginBottom: 16 }}>
      <h3 className="admin-sidebar-title">Writing Engine</h3>
      <p className="admin-field-hint">
        Context → Plan → Generate → Start Review → Approve → Handoff Blog DRAFT. Không auto-publish.
      </p>

      {contentGenStatus && !aiConfigured && <AiEmptyState />}

      {aiQueue.items.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <AiGenerationQueue items={aiQueue.items} onDismiss={aiQueue.remove} />
        </div>
      )}

      {canvasMode ? (
        <details style={{ margin: "8px 0" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Cài đặt tạo nội dung</summary>
          <div style={{ marginTop: 8 }}>{contentSetupFields}</div>
        </details>
      ) : (
        contentSetupFields
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 }}>
        {plan?.readiness.ready && (
          <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void createDraftShell()}>
            Draft shell
          </AdminLoadingButton>
        )}
        {draft?.id && (
          <>
            <AdminLoadingButton pending={building} variant="primary" size="small" onClick={() => void generate("ALL")}>
              Generate all sections
            </AdminLoadingButton>
            <AdminLoadingButton
              pending={building}
              variant="secondary"
              size="small"
              onClick={() => void generate("SELECTED")}
            >
              Generate selected
            </AdminLoadingButton>
            <AdminLoadingButton
              pending={building}
              variant="secondary"
              size="small"
              onClick={() => void generate("UNLOCKED_ONLY")}
            >
              Generate unlocked
            </AdminLoadingButton>
            <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void runQa()}>
              Full QA
            </AdminLoadingButton>
            <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void renderPreview()}>
              Render preview
            </AdminLoadingButton>
            {(draft.status === "REVIEW_READY" || draft.status === "QA_FAILED") && (
              <AdminLoadingButton pending={building} variant="primary" size="small" onClick={() => void startReview()}>
                Start review
              </AdminLoadingButton>
            )}
            {activeRunId && (
              <AdminLoadingButton pending={false} variant="secondary" size="small" onClick={() => void cancelRun()}>
                Cancel run
              </AdminLoadingButton>
            )}
          </>
        )}
      </div>

      {(activeReviewId || reviewStatus) && (
        <p className="admin-field-hint">
          Review: {reviewStatus ?? "—"}
          {activeReviewId ? (
            <>
              {" "}
              · <Link href={`/admin/content/reviews/${activeReviewId}`}>Open review workspace</Link>
            </>
          ) : null}{" "}
          · <Link href="/admin/content/reviews">Danh sách kiểm duyệt</Link>
        </p>
      )}

      {runStatus && (
        <p className="admin-field-hint">
          Run {runStatus.status}: gen {runStatus.generated}/{runStatus.totalSections} · fail {runStatus.failed} ·
          tokens {runStatus.usage.totalTokens ?? "—"} · cost{" "}
          {runStatus.usage.estimatedCostUsd != null ? `$${runStatus.usage.estimatedCostUsd}` : "n/a"} ·{" "}
          {runStatus.usage.latencyMs ?? "—"}ms
        </p>
      )}

      {draft && <p className="admin-field-hint">Draft v{draftVersion} · {draft.status}</p>}
      {cacheHint && <p className="admin-field-hint">Plan cache hit.</p>}

      {plan && (
        <>
          {canvasMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "8px 0" }}>
              {plan.sections.map((s) => {
                const state = sectionEditorialState(s.id);
                return (
                  <div key={s.id} className={canvasStyles.sectionRow}>
                    <div className={canvasStyles.sectionRowHeading}>
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(s.id)}
                        onChange={(e) => {
                          setSelectedSectionIds((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id),
                          );
                        }}
                        aria-label={`Chọn section ${s.heading}`}
                      />
                      <strong>{s.heading}</strong>
                      <span className={`${canvasStyles.sectionStateDot} ${SECTION_STATE_CLASS[state]}`}>
                        {SECTION_EDITORIAL_STATE_LABELS[state]}
                      </span>
                      <span className="admin-field-hint">
                        {sectionBadge(s.id)} · {s.targetWordCountMin}-{s.targetWordCountMax} từ
                      </span>
                    </div>
                    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void generateOne(s.id, "generate")}>
                        Generate
                      </button>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void generateOne(s.id, "retry")}>
                        Retry
                      </button>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void generateOne(s.id, "regenerate")}>
                        Regenerate
                      </button>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void toggleLock(s.id, !locks[s.id])}>
                        {locks[s.id] ? "Unlock" : "Lock"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() => {
                          setEditSectionId(s.id);
                          setEditHtml(draft?.sections?.find((x) => x.sectionId === s.id)?.html ?? "");
                        }}
                      >
                        Edit
                      </button>
                    </div>
                    {draft?.id && plan?.id && (
                      <div className={canvasStyles.sectionAiWrap} style={{ marginTop: 6 }}>
                        <WritingSectionAiAssistant
                          topicId={topicId}
                          writingPlanId={plan.id}
                          writingDraftId={draft.id}
                          contextBuildId={contextBuildId || null}
                          sectionId={s.id}
                          sectionHeading={s.heading}
                          currentHtml={draft.sections?.find((x) => x.sectionId === s.id)?.html ?? ""}
                          draftVersion={draftVersion}
                          aiEnabled={Boolean(contentGenStatus?.enabled)}
                          aiConfigured={aiConfigured}
                          statusSummary={contentGenStatus ? { provider: contentGenStatus.provider, model: contentGenStatus.model } : null}
                          contextCounts={{
                            facts: s.requiredFactIds.length + s.optionalFactIds.length,
                            media: s.mediaAssetIds.length,
                            links: s.internalLinkIds.length,
                          }}
                          qaIssues={draft?.qa?.issues.map((issue) => ({ code: issue.code, severity: "WARN", message: issue.message }))}
                          onDraftMutated={() => void reloadDraftAfterAi()}
                          onQueueUpdate={aiQueue.upsert}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Section id="sections" title={`Sections (${plan.sections.length})`}>
              <ul style={{ fontSize: 13, paddingLeft: 16, listStyle: "none" }}>
                {plan.sections.map((s) => (
                  <li key={s.id} style={{ marginBottom: 8 }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(s.id)}
                        onChange={(e) => {
                          setSelectedSectionIds((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)
                          );
                        }}
                      />
                      <span>
                        <strong>{s.heading}</strong> · {sectionBadge(s.id)} · {s.targetWordCountMin}-{s.targetWordCountMax} từ
                        <br />
                        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void generateOne(s.id, "generate")}>
                            Generate
                          </button>
                          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void generateOne(s.id, "retry")}>
                            Retry
                          </button>
                          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void generateOne(s.id, "regenerate")}>
                            Regenerate
                          </button>
                          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void toggleLock(s.id, !locks[s.id])}>
                            {locks[s.id] ? "Unlock" : "Lock"}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--small"
                            onClick={() => {
                              setEditSectionId(s.id);
                              setEditHtml(draft?.sections?.find((x) => x.sectionId === s.id)?.html ?? "");
                            }}
                          >
                            Edit
                          </button>
                        </span>
                        {draft?.id && plan?.id && (
                          <WritingSectionAiAssistant
                            topicId={topicId}
                            writingPlanId={plan.id}
                            writingDraftId={draft.id}
                            contextBuildId={contextBuildId || null}
                            sectionId={s.id}
                            sectionHeading={s.heading}
                            currentHtml={draft.sections?.find((x) => x.sectionId === s.id)?.html ?? ""}
                            draftVersion={draftVersion}
                            aiEnabled={Boolean(contentGenStatus?.enabled)}
                            aiConfigured={aiConfigured}
                            statusSummary={contentGenStatus ? { provider: contentGenStatus.provider, model: contentGenStatus.model } : null}
                            contextCounts={{
                              facts: s.requiredFactIds.length + s.optionalFactIds.length,
                              media: s.mediaAssetIds.length,
                              links: s.internalLinkIds.length,
                            }}
                            qaIssues={draft?.qa?.issues.map((issue) => ({ code: issue.code, severity: "WARN", message: issue.message }))}
                            onDraftMutated={() => void reloadDraftAfterAi()}
                            onQueueUpdate={aiQueue.upsert}
                          />
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {editSectionId && (
            <Section id="edit" title="Manual edit">
              <textarea
                ref={editTextareaRef}
                className="admin-input"
                rows={5}
                value={editHtml}
                onChange={(e) => setEditHtml(e.target.value)}
                placeholder="HTML section body"
              />
              <InlineTextAiToolbar
                textareaRef={editTextareaRef}
                disabled={!aiConfigured}
                disabledReason="AI chưa được cấu hình."
                onRequestRewrite={(instruction, selectedText) => void runInlineTextAiRewrite(instruction, selectedText)}
              />
              <AdminLoadingButton pending={building} variant="primary" size="small" onClick={() => void saveEdit()}>
                Lưu & khóa
              </AdminLoadingButton>
            </Section>
          )}

          <Section id="readiness" title="Readiness / Meta">
            <p className="admin-field-hint">
              Plan score {plan.readiness.score} · CTA {plan.ctaPlan.primary.text} ·{" "}
              {plan.keywordPlan.primaryKeyword}
            </p>
            {plan.readiness.errors.map((e) => (
              <p key={e.code} style={{ color: "#c00" }}>
                {e.message}
              </p>
            ))}
          </Section>

          <Section id="inline-media" title="Ảnh trong nội dung">
            <p className="admin-field-hint">
              {plan.mediaPlan.inlineHints
                ? `Khuyến nghị ${plan.mediaPlan.inlineHints.recommendedImageCount} ảnh · intents: ${plan.mediaPlan.inlineHints.requiredIntents.slice(0, 6).join(", ") || "—"}. Không tự chèn khi mở trang.`
                : "Hoàn tất draft rồi lập kế hoạch ảnh. Áp dụng chính thức trong Blog Editor sau Handoff."}
            </p>
            {draft?.id ? (
              <AdminLoadingButton
                pending={inlinePlanBusy}
                variant="secondary"
                size="small"
                onClick={() => void runInlineMediaPlan()}
              >
                Lập kế hoạch ảnh nội dung
              </AdminLoadingButton>
            ) : (
              <p className="admin-field-hint">Tạo Draft shell / Generate trước khi lập kế hoạch ảnh.</p>
            )}
            {inlinePlanSummary && (
              <pre
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  background: "#f7f7f7",
                  padding: 8,
                  borderRadius: 4,
                }}
              >
                {inlinePlanSummary}
              </pre>
            )}
          </Section>

          <Section id="ai-history" title={`Lịch sử AI (${aiHistory.length})`}>
            <AiHistoryTimeline items={aiHistory} />
          </Section>
        </>
      )}

      {timeline.length > 0 && (
        <Section id="timeline" title="Generation timeline">
          <ul style={{ fontSize: 12, paddingLeft: 16 }}>
            {timeline.slice(-12).map((e, i) => (
              <li key={i}>
                {e.type}: {e.message}
                {e.sectionId ? ` (${e.sectionId.slice(0, 8)})` : ""}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {draft?.rendered?.html && (
        <Section id="preview" title="Rendered preview">
          <div
            style={{ maxHeight: 240, overflow: "auto", border: "1px solid #ddd", padding: 8, fontSize: 13 }}
            dangerouslySetInnerHTML={{ __html: draft.rendered.html }}
          />
        </Section>
      )}

    </div>
  );
}
