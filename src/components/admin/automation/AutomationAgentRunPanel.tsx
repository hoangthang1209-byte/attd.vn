"use client";

import { useEffect, useState } from "react";
import type { AgentRunHistoryResponse, AgentRunListItem } from "@/features/agent-os/agent-run.types";
import { formatQuoteDateTime } from "@/features/quotes/format";

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

export default function AutomationAgentRunPanel({ issueNumber, active }: Props) {
  const [result, setResult] = useState<{
    issueNumber: number;
    data: AgentRunHistoryResponse | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    void fetch(`/api/admin/automation/agent-runs?issueNumber=${issueNumber}&limit=10`)
      .then(async (response) => {
        const json = (await response.json()) as AgentRunHistoryResponse & { message?: string };
        if (!response.ok) throw new Error(json.message ?? "Không thể tải agent run");
        if (!cancelled) {
          setResult({ issueNumber, data: json, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            issueNumber,
            data: null,
            error: err instanceof Error ? err.message : "Lỗi tải agent run",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, issueNumber]);

  if (!active) return null;

  const currentResult = result?.issueNumber === issueNumber ? result : null;
  const data = currentResult?.data ?? null;
  const error = currentResult?.error ?? null;
  const loading = currentResult === null;

  return (
    <div className="automation-agent-run-panel admin-panel">
      <h3 className="admin-subsection-title">VNC Agent OS — lịch sử chạy (G2)</h3>
      {loading ? <p className="admin-muted">Đang tải lịch sử agent run…</p> : null}
      {error ? <p className="admin-error">{error}</p> : null}
      {!loading && !error && data && data.runs.length === 0 ? (
        <p className="admin-muted">Chưa có bản ghi AgentRun cho issue này trong cơ sở dữ liệu.</p>
      ) : null}
      {!loading && !error && data?.currentRun ? (
        <p>
          <strong>Run hiện tại:</strong> {data.currentRun.agentId} ·{" "}
          {AGENT_RUN_STATUS_LABELS[data.currentRun.status]} · lần thử #{data.currentRun.attemptNumber}
          {data.currentRun.humanApprovalRequired ? " · Cần duyệt con người" : ""}
          {data.currentRun.humanApprovalReceivedAt ? " · Đã duyệt" : ""}
        </p>
      ) : null}
      {!loading && !error && data && data.runs.length > 0 ? (
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
