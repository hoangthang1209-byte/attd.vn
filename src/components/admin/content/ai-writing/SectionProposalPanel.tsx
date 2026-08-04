"use client";

import { useState } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import AiLoadingSkeleton from "@/components/admin/content/ai-writing/AiLoadingSkeleton";
import ProposalDiffView from "@/components/admin/content/ai-writing/ProposalDiffView";
import ProposalStatusBar, { type ProposalStatusBarData } from "@/components/admin/content/ai-writing/ProposalStatusBar";
import ProposalContextChips, {
  type ProposalContextChipsData,
} from "@/components/admin/content/ai-writing/ProposalContextChips";
import WhyReasoningPanel from "@/components/admin/content/ai-writing/WhyReasoningPanel";
import type { ProposalDisplay } from "@/features/content-generation/ux/proposal-display";

export type SectionProposalPanelData = {
  id: string;
  actionLabel: string;
  display: ProposalDisplay;
  statusBar: ProposalStatusBarData;
  contextChips: ProposalContextChipsData;
  warnings: string[];
};

type Props = {
  proposal: SectionProposalPanelData | null;
  originalText: string;
  loading: boolean;
  applying: boolean;
  errorMessage: string | null;
  appliedDraftVersion: number | null;
  onApply: () => void;
  onEditApply: (editedHtml: string) => void;
  onRetry: () => void;
  onReject: () => void;
  onCancel: () => void;
  onDismiss?: () => void;
};

/**
 * Inline panel (never a modal): Current summary → AI Proposal → Diff →
 * actions. Apply/Reject/Retry are the only things that mutate anything —
 * this component itself never writes to the draft.
 */
export default function SectionProposalPanel({
  proposal,
  originalText,
  loading,
  applying,
  errorMessage,
  appliedDraftVersion,
  onApply,
  onEditApply,
  onRetry,
  onReject,
  onCancel,
  onDismiss,
}: Props) {
  // Callers key this component by `proposal.id`, so a new proposal remounts
  // this component fresh instead of needing an effect to reset local state.
  const [editing, setEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState(() => proposal?.display.html ?? proposal?.display.plainText ?? "");

  if (loading) {
    return (
      <div className={styles.panel}>
        <p className={styles.panelTitle}>Đang tạo đề xuất AI…</p>
        <AiLoadingSkeleton />
        <div className={styles.panelActions}>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!proposal) return null;

  const proposalText = proposal.display.html ?? proposal.display.plainText ?? "";

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <p className={styles.panelTitle}>Đề xuất AI · {proposal.actionLabel}</p>
        {appliedDraftVersion != null && <span className={styles.appliedFlash}>✓ Applied · Draft v{appliedDraftVersion}</span>}
      </div>

      {errorMessage && (
        <p className="admin-field-hint" style={{ color: "#b91c1c" }}>
          {errorMessage}
        </p>
      )}

      <ProposalStatusBar data={proposal.statusBar} />
      <ProposalContextChips data={proposal.contextChips} />

      {proposal.warnings.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#92400e" }}>
          {proposal.warnings.map((w, idx) => (
            <li key={idx}>{w}</li>
          ))}
        </ul>
      )}

      <WhyReasoningPanel items={proposal.display.why} />

      {proposalText || originalText ? (
        <ProposalDiffView originalText={originalText} proposalText={proposalText} />
      ) : (
        <p className="admin-field-hint">Đề xuất không có nội dung văn bản để so sánh.</p>
      )}

      {editing && (
        <div>
          <label className="admin-label" htmlFor={`ai-edit-${proposal.id}`}>
            Chỉnh sửa trước khi Apply
          </label>
          <textarea
            id={`ai-edit-${proposal.id}`}
            className="admin-input"
            rows={6}
            value={editedHtml}
            onChange={(e) => setEditedHtml(e.target.value)}
          />
        </div>
      )}

      <div className={styles.panelActions}>
        {appliedDraftVersion != null ? (
          onDismiss && (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onDismiss}>
              Đóng
            </button>
          )
        ) : editing ? (
          <>
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--small"
              disabled={applying}
              onClick={() => onEditApply(editedHtml)}
            >
              Apply bản đã sửa
            </button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setEditing(false)}>
              Huỷ sửa
            </button>
          </>
        ) : (
          <>
            <button type="button" className="admin-btn admin-btn--primary admin-btn--small" disabled={applying} onClick={onApply}>
              {applying ? "Đang áp dụng…" : "Apply"}
            </button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={applying} onClick={() => setEditing(true)}>
              Edit before Apply
            </button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={applying} onClick={onRetry}>
              Retry
            </button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" disabled={applying} onClick={onReject}>
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
