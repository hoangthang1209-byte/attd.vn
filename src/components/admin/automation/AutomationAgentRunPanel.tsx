"use client";

import { useEffect, useState } from "react";
import type { AgentRunHistoryResponse, AgentRunListItem } from "@/features/agent-os/agent-run.types";
import type { CtoLoopVisibility } from "@/features/agent-os/cto-loop.types";
import { formatQuoteDateTime } from "@/features/quotes/format";
import { loadAgentRunPanelData } from "@/components/admin/automation/automation-agent-run-panel.load";

const AGENT_RUN_STATUS_LABELS: Record<AgentRunListItem["status"], string> = {
  QUEUED: "Hàng đợi",
  RUNNING: "Đang chạy",
  WAITING_EXTERNAL: "Chờ bên ngoài",
  WAITING_HUMAN: "Chờ con người",
  SUCCEEDED: "Thành công",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

type Props = {
  issueNumber: number;
  active: boolean;
};

type PanelResult = {
  issueNumber: number;
  data: AgentRunHistoryResponse | null;
  ctoLoop: CtoLoopVisibility | null;
  g2Error: string | null;
  ctoLoopError: string | null;
};

export default function AutomationAgentRunPanel({ issueNumber, active }: Props) {
  const [result, setResult] = useState<PanelResult | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    void loadAgentRunPanelData(issueNumber).then((loaded) => {
      if (!cancelled) {
        setResult({ issueNumber, ...loaded });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [active, issueNumber]);

  if (!active) return null;

  const currentResult = result?.issueNumber === issueNumber ? result : null;
  const data = currentResult?.data ?? null;
  const ctoLoop = currentResult?.ctoLoop ?? null;
  const g2Error = currentResult?.g2Error ?? null;
  const ctoLoopError = currentResult?.ctoLoopError ?? null;
  const loading = currentResult === null;

  const showG2Body = !loading && !g2Error && data !== null;
  const showG2Error = !loading && g2Error !== null;

  return (
    <div className="automation-agent-run-panel admin-panel">
      <h3 className="admin-subsection-title">Agent OS — lịch sử chạy (G2)</h3>
      {loading ? <p className="admin-muted">Đang tải lịch sử agent run…</p> : null}
      {showG2Error ? <p className="admin-error">{g2Error}</p> : null}
      {!loading && ctoLoopError ? (
        <p className="admin-muted">CTO loop (G3): {ctoLoopError}</p>
      ) : null}
      {showG2Body && data.runs.length === 0 ? (
        <p className="admin-muted">Chưa có bản ghi AgentRun cho issue này trong cơ sở dữ liệu.</p>
      ) : null}
      {!loading && ctoLoop ? (
        <div className="automation-agent-run-panel__g3">
          <h4 className="admin-subsection-title">CTO loop (G3)</h4>
          <p className="admin-muted">
            Agent gán: {ctoLoop.assignedAgentId ?? "—"} · Hành động: {ctoLoop.selectedAction ?? "—"} ·
            Ưu tiên: {ctoLoop.priorityTier ?? "—"}
            {ctoLoop.priorityReason ? ` (${ctoLoop.priorityReason})` : ""}
          </p>
          <p className="admin-muted">
            Xác minh gần nhất: {ctoLoop.lastVerifiedResult ?? "—"} · Trạng thái run:{" "}
            {ctoLoop.runStatus ?? "—"}
            {ctoLoop.attemptNumber != null ? ` · Lần thử #${ctoLoop.attemptNumber}` : ""}
            {ctoLoop.correlationId ? ` · Correlation: ${ctoLoop.correlationId}` : ""}
          </p>
          {ctoLoop.blockerReason ? (
            <p className="admin-error">Blocker: {ctoLoop.blockerReason}</p>
          ) : null}
          {ctoLoop.nextAction ? <p>Tiếp theo: {ctoLoop.nextAction}</p> : null}
          {ctoLoop.humanApprovalRequired ? (
            <p>{ctoLoop.humanApprovalReceivedAt ? "Đã duyệt con người" : "Cần duyệt con người"}</p>
          ) : null}
        </div>
      ) : null}
      {showG2Body && data.currentRun ? (
        <p>
          <strong>Run hiện tại:</strong> {data.currentRun.agentId} ·{" "}
          {AGENT_RUN_STATUS_LABELS[data.currentRun.status]} · lần thử #{data.currentRun.attemptNumber}
          {data.currentRun.humanApprovalRequired ? " · Cần duyệt con người" : ""}
          {data.currentRun.humanApprovalReceivedAt ? " · Đã duyệt" : ""}
        </p>
      ) : null}
      {showG2Body && data.runs.length > 0 ? (
        <ul className="automation-agent-run-panel__list">
          {data.runs.map((run) => (
            <li key={run.id} className="automation-agent-run-panel__item">
              <span>
                #{run.attemptNumber} · {run.agentId} · {AGENT_RUN_STATUS_LABELS[run.status]}
              </span>
              {run.blockerReason ? (
                <span className="admin-error"> · Blocker: {run.blockerReason}</span>
              ) : null}
              {run.nextAction ? <span> · Tiếp theo: {run.nextAction}</span> : null}
              {run.lastEvent ? (
                <span className="admin-muted">
                  {" "}
                  · Sự kiện cuối: {run.lastEvent.source} (
                  {formatQuoteDateTime(run.lastEvent.appliedAt)})
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
