"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import SectionAiMenu from "@/components/admin/content/ai-writing/SectionAiMenu";
import SectionProposalPanel, {
  type SectionProposalPanelData,
} from "@/components/admin/content/ai-writing/SectionProposalPanel";
import SectionQualityChips from "@/components/admin/content/ai-writing/SectionQualityChips";
import AiEmptyState from "@/components/admin/content/ai-writing/AiEmptyState";
import { useAiWritingShortcuts, AI_SECTION_ACTIVE_ATTR } from "@/components/admin/content/ai-writing/useAiWritingShortcuts";
import type { AiQueueItem } from "@/components/admin/content/ai-writing/useAiWritingQueue";
import { resolveAiMenuAction, type AiSectionMenuActionId } from "@/features/content-generation/ux/ai-menu-actions";
import { extractProposalDisplay } from "@/features/content-generation/ux/proposal-display";
import { computeSectionQualityChips } from "@/features/content-generation/ux/section-quality";
import { htmlToPlainForDiff } from "@/features/content-generation/ux/text-diff";

type QaIssueLike = { code: string; severity: string; message: string };

type SafeProposal = {
  id: string;
  type: string;
  provider: string;
  model: string;
  output: unknown;
  warnings: unknown;
  usage: { totalTokens: number | null; estimatedCostUsd: number | null };
  startedAt: string | Date | null;
  completedAt: string | Date | null;
};

export type WritingSectionAiAssistantProps = {
  topicId: string;
  writingPlanId: string;
  writingDraftId: string | null;
  contextBuildId: string | null;
  sectionId: string;
  sectionHeading: string;
  currentHtml: string;
  draftVersion: number | null;
  aiEnabled: boolean;
  aiConfigured: boolean;
  statusSummary?: { provider: string; model: string } | null;
  contextCounts?: { facts: number; media: number; links: number };
  qaIssues?: QaIssueLike[];
  onDraftMutated?: () => void;
  onQueueUpdate?: (item: AiQueueItem) => void;
};

function msBetween(a: string | Date | null, b: string | Date | null): number | null {
  if (!a || !b) return null;
  const start = typeof a === "string" ? new Date(a).getTime() : a.getTime();
  const end = typeof b === "string" ? new Date(b).getTime() : b.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, end - start);
}

/**
 * Per-section inline AI assistant: menu → proposal panel → quality chips.
 * When AI is off/not configured, the menu disables itself and shows
 * `AiEmptyState` — writing is never blocked.
 */
export default function WritingSectionAiAssistant({
  topicId,
  writingPlanId,
  writingDraftId,
  contextBuildId,
  sectionId,
  sectionHeading,
  currentHtml,
  draftVersion,
  aiEnabled,
  aiConfigured,
  statusSummary,
  contextCounts,
  qaIssues,
  onDraftMutated,
  onQueueUpdate,
}: WritingSectionAiAssistantProps) {
  const toast = useAdminToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposal, setProposal] = useState<SectionProposalPanelData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appliedDraftVersion, setAppliedDraftVersion] = useState<number | null>(null);
  const lastActionIdRef = useRef<AiSectionMenuActionId | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = !aiEnabled || !aiConfigured;
  const disabledReason = !aiEnabled
    ? "AI chưa được cấu hình. Bạn vẫn có thể tiếp tục viết bài bình thường."
    : !aiConfigured
      ? "Provider AI chưa sẵn sàng (thiếu key/cấu hình)."
      : undefined;

  const qualityChips = useMemo(
    () => computeSectionQualityChips({ html: currentHtml, qaIssues: qaIssues ?? [] }),
    [currentHtml, qaIssues],
  );

  const originalPlainForDiff = useMemo(() => htmlToPlainForDiff(currentHtml), [currentHtml]);

  const runGeneration = useCallback(
    async (actionId: AiSectionMenuActionId) => {
      const action = resolveAiMenuAction(actionId);
      if (!action || disabled) return;

      lastActionIdRef.current = actionId;
      setErrorMessage(null);
      setAppliedDraftVersion(null);
      setProposal(null);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const queueId = `${sectionId}-${actionId}-${Date.now()}`;
      onQueueUpdate?.({
        id: queueId,
        sectionId,
        sectionHeading,
        actionLabel: action.label,
        status: "RUNNING",
        createdAt: Date.now(),
      });

      try {
        const res = await fetch("/api/content/generation/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            type: action.type,
            topicId,
            writingPlanId,
            writingDraftId,
            sectionId,
            contextBuildId,
            editorInstruction: action.buildInstruction ? action.buildInstruction() : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Tạo đề xuất AI thất bại.");

        const run = data.proposal as SafeProposal;
        const display = extractProposalDisplay(action.type, run.output);
        const warnings = Array.isArray(run.warnings) ? (run.warnings as string[]) : [];

        setProposal({
          id: run.id,
          actionLabel: action.label,
          display,
          statusBar: {
            provider: run.provider,
            model: run.model,
            totalTokens: run.usage?.totalTokens ?? null,
            estimatedCostUsd: run.usage?.estimatedCostUsd ?? null,
            generationTimeMs: msBetween(run.startedAt, run.completedAt),
            factCount: display.factIds.length,
            mediaCount: display.mediaIds.length,
            linkCount: display.linkIds.length,
          },
          contextChips: {
            factIds: display.factIds,
            mediaIds: display.mediaIds,
            linkIds: display.linkIds,
            brandRulesOn: true,
            claimSafetyOn: true,
          },
          warnings: [...warnings, ...display.warnings.filter((w) => !warnings.includes(w))],
        });
        onQueueUpdate?.({
          id: queueId,
          sectionId,
          sectionHeading,
          actionLabel: action.label,
          status: "COMPLETED",
          createdAt: Date.now(),
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Tạo đề xuất AI thất bại.";
        setErrorMessage(message);
        toast.error(message);
        onQueueUpdate?.({
          id: queueId,
          sectionId,
          sectionHeading,
          actionLabel: action.label,
          status: "FAILED",
          createdAt: Date.now(),
          message,
        });
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [contextBuildId, disabled, onQueueUpdate, sectionHeading, sectionId, topicId, toast, writingDraftId, writingPlanId],
  );

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const closeProposal = useCallback(() => {
    setProposal(null);
    setAppliedDraftVersion(null);
    setErrorMessage(null);
  }, []);

  const applyProposal = useCallback(
    async (editedOutput?: unknown) => {
      if (!proposal) return;
      setApplying(true);
      try {
        const res = await fetch(`/api/content/generation/${proposal.id}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedOutput !== undefined ? { editedOutput } : {}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Apply thất bại.");
        const version = (data.result as { version?: number } | undefined)?.version ?? draftVersion ?? null;
        setAppliedDraftVersion(version);
        toast.success("Đã áp dụng đề xuất AI.");
        onDraftMutated?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Apply thất bại.";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setApplying(false);
      }
    },
    [draftVersion, onDraftMutated, proposal, toast],
  );

  const rejectProposal = useCallback(async () => {
    if (!proposal) return;
    try {
      const res = await fetch(`/api/content/generation/${proposal.id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Từ chối thất bại.");
      toast.info("Đã từ chối đề xuất.");
      closeProposal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Từ chối thất bại.");
    }
  }, [closeProposal, proposal, toast]);

  const retryProposal = useCallback(() => {
    const actionId = lastActionIdRef.current;
    if (actionId) void runGeneration(actionId);
  }, [runGeneration]);

  const sectionActive = menuOpen || loading || proposal != null;

  useAiWritingShortcuts(sectionActive, {
    onOpenMenu: () => setMenuOpen(true),
    onGenerateOrApply: () => {
      if (proposal && appliedDraftVersion == null) void applyProposal();
      else if (!proposal && !loading) void runGeneration("draft");
    },
    onEscape: () => {
      if (loading) cancelGeneration();
      else if (menuOpen) setMenuOpen(false);
      else if (proposal) closeProposal();
    },
  });

  return (
    <div {...{ [AI_SECTION_ACTIVE_ATTR]: sectionActive ? "true" : undefined }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <SectionAiMenu
          disabled={disabled}
          disabledReason={disabledReason}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          forceVisible={proposal != null || loading}
          onAction={(actionId) => void runGeneration(actionId)}
        />
        <SectionQualityChips chips={qualityChips} />
      </div>

      {disabled && !proposal && !loading && <AiEmptyState reason={disabledReason} />}

      {(loading || proposal) && (
        <SectionProposalPanel
          key={proposal?.id ?? "loading"}
          proposal={proposal}
          originalText={originalPlainForDiff}
          loading={loading}
          applying={applying}
          errorMessage={errorMessage}
          appliedDraftVersion={appliedDraftVersion}
          onApply={() => void applyProposal()}
          onEditApply={(editedHtml) =>
            void applyProposal({ html: editedHtml, plainText: htmlToPlainForDiff(editedHtml) })
          }
          onRetry={retryProposal}
          onReject={() => void rejectProposal()}
          onCancel={cancelGeneration}
          onDismiss={closeProposal}
        />
      )}

      {!disabled && !proposal && !loading && (statusSummary || contextCounts) && (
        <p className="admin-field-hint">
          {statusSummary ? `${statusSummary.provider}/${statusSummary.model}` : null}
          {statusSummary && contextCounts ? " · " : null}
          {contextCounts
            ? `Context: ${contextCounts.facts} facts · ${contextCounts.media} media · ${contextCounts.links} links`
            : null}
        </p>
      )}
    </div>
  );
}
