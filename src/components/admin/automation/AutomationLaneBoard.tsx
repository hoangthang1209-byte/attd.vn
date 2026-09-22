"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AUTOMATION_LANE_OVERALL_STATE_LABELS,
  buildLaneBoard,
  buildLaneBoardSummary,
  type AutomationLaneBoardEntry,
  type AutomationLaneOverallState,
} from "@/features/automation/automation-lane-board";
import {
  AUTOMATION_PRODUCTION_STATUS_BADGE_CLASS,
  AUTOMATION_PRODUCTION_STATUS_LABELS,
  AUTOMATION_PR_STATE_SUFFIX,
} from "@/features/automation/labels";
import type { AutomationTask } from "@/features/automation/automation-task.types";
import { formatQuoteDateTime } from "@/features/quotes/format";

const LANE_STATE_BADGE_CLASS: Record<AutomationLaneOverallState, string> = {
  dang_build: "admin-status-badge admin-status-badge--info",
  dang_kiem_tra: "admin-status-badge admin-status-badge--warning",
  can_sua: "admin-status-badge admin-status-badge--warning",
  san_sang_merge: "admin-status-badge admin-status-badge--success",
  dang_deploy: "admin-status-badge admin-status-badge--info",
  production: "admin-status-badge admin-status-badge--success",
  blocked: "admin-status-badge admin-status-badge--danger",
  chua_co_task: "admin-status-badge admin-status-badge--neutral",
};

type AutomationLaneBoardProps = {
  tasks: AutomationTask[];
  lastUpdatedAt: string | null;
  autoRefreshLabel?: string;
  onSelectTask?: (issueNumber: number) => void;
};

export default function AutomationLaneBoard({
  tasks,
  lastUpdatedAt,
  autoRefreshLabel,
  onSelectTask,
}: AutomationLaneBoardProps) {
  const board = useMemo(() => buildLaneBoard(tasks), [tasks]);
  const summary = useMemo(() => buildLaneBoardSummary(board), [board]);

  return (
    <section className="automation-lane-board" aria-label="Bảng điều khiển 7 mảng phát triển">
      <div className="automation-lane-board__header">
        <div>
          <h2 className="automation-lane-board__title">Bảng điều khiển 7 mảng</h2>
          <p className="admin-muted automation-lane-board__subtitle">
            Tổng quan trạng thái từng mảng phát triển ·{" "}
            {autoRefreshLabel ?? "Tự cập nhật ~60 giây"}
            {lastUpdatedAt ? <> · Cập nhật lúc {formatQuoteDateTime(lastUpdatedAt)}</> : null}
          </p>
        </div>
      </div>

      <div className="sales-follow-up__stats automation-lane-board__summary">
        <article className="sales-follow-up__stat-card">
          <span className="sales-follow-up__stat-label">7 mảng</span>
          <strong className="sales-follow-up__stat-value">{summary.totalLanes}</strong>
        </article>
        <article className="sales-follow-up__stat-card sales-follow-up__stat-card--info">
          <span className="sales-follow-up__stat-label">Đang chạy</span>
          <strong className="sales-follow-up__stat-value">{summary.runningCount}</strong>
        </article>
        <article className="sales-follow-up__stat-card sales-follow-up__stat-card--danger">
          <span className="sales-follow-up__stat-label">Cần xử lý / Blocked</span>
          <strong className="sales-follow-up__stat-value">{summary.blockedOrNeedsFixCount}</strong>
        </article>
        <article className="sales-follow-up__stat-card sales-follow-up__stat-card--success">
          <span className="sales-follow-up__stat-label">Production / Hoàn tất</span>
          <strong className="sales-follow-up__stat-value">{summary.productionCount}</strong>
        </article>
      </div>

      <div className="admin-table-wrap automation-lane-board__table-wrap">
        <table className="admin-table admin-table--compact automation-lane-board__table">
          <thead>
            <tr>
              <th>Mảng</th>
              <th>Task hiện tại</th>
              <th>Trạng thái</th>
              <th>PR</th>
              <th>CI / Review</th>
              <th>Production</th>
              <th>Việc tiếp theo</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {board.map((entry) => (
              <AutomationLaneBoardRow key={entry.laneId} entry={entry} onSelectTask={onSelectTask} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="automation-lane-board__cards">
        {board.map((entry) => (
          <AutomationLaneBoardCard key={entry.laneId} entry={entry} onSelectTask={onSelectTask} />
        ))}
      </div>
    </section>
  );
}

function LaneStateBadge({ entry }: { entry: AutomationLaneBoardEntry }) {
  return (
    <span className={LANE_STATE_BADGE_CLASS[entry.overallState]}>
      {entry.overallStateLabel}
    </span>
  );
}

function TaskLink({
  task,
  onSelectTask,
}: {
  task: AutomationTask;
  onSelectTask?: (issueNumber: number) => void;
}) {
  if (onSelectTask) {
    return (
      <button
        type="button"
        className="admin-link automation-lane-board__task-link"
        onClick={() => onSelectTask(task.issueNumber)}
      >
        #{task.issueNumber} — {task.title}
      </button>
    );
  }

  return (
    <Link href={task.githubIssueUrl} className="admin-link" target="_blank" rel="noreferrer">
      #{task.issueNumber} — {task.title}
    </Link>
  );
}

function PullRequestCell({ task }: { task: AutomationTask | null }) {
  if (!task?.linkedPullRequest) return <>—</>;

  const pr = task.linkedPullRequest;
  const suffix = pr.merged
    ? AUTOMATION_PR_STATE_SUFFIX.merged
    : pr.state === "open"
      ? AUTOMATION_PR_STATE_SUFFIX.open
      : AUTOMATION_PR_STATE_SUFFIX.closed;

  return (
    <Link href={pr.url} className="admin-link" target="_blank" rel="noreferrer">
      #{pr.number}
      {suffix}
    </Link>
  );
}

function ProductionCell({ task }: { task: AutomationTask | null }) {
  if (!task) return <>—</>;
  const { productionStatus } = task;
  return (
    <span
      className={AUTOMATION_PRODUCTION_STATUS_BADGE_CLASS[productionStatus.status]}
      title={productionStatus.reason ?? undefined}
    >
      {AUTOMATION_PRODUCTION_STATUS_LABELS[productionStatus.status]}
    </span>
  );
}

function AutomationLaneBoardRow({
  entry,
  onSelectTask,
}: {
  entry: AutomationLaneBoardEntry;
  onSelectTask?: (issueNumber: number) => void;
}) {
  return (
    <tr>
      <td className="automation-lane-board__lane-cell">{entry.laneLabel}</td>
      <td className="automation-lane-board__task-cell">
        {entry.task ? (
          <TaskLink task={entry.task} onSelectTask={onSelectTask} />
        ) : (
          <span className="admin-muted">{AUTOMATION_LANE_OVERALL_STATE_LABELS.chua_co_task}</span>
        )}
      </td>
      <td>
        <LaneStateBadge entry={entry} />
      </td>
      <td>
        <PullRequestCell task={entry.task} />
      </td>
      <td>{entry.ciReviewDisplay}</td>
      <td>
        <ProductionCell task={entry.task} />
      </td>
      <td>{entry.nextAction}</td>
      <td>{entry.lastUpdateAt ? formatQuoteDateTime(entry.lastUpdateAt) : "—"}</td>
    </tr>
  );
}

function AutomationLaneBoardCard({
  entry,
  onSelectTask,
}: {
  entry: AutomationLaneBoardEntry;
  onSelectTask?: (issueNumber: number) => void;
}) {
  return (
    <article className="automation-lane-board__card">
      <div className="automation-lane-board__card-header">
        <strong>{entry.laneLabel}</strong>
        <LaneStateBadge entry={entry} />
      </div>

      <p className="automation-lane-board__card-task">
        {entry.task ? (
          <TaskLink task={entry.task} onSelectTask={onSelectTask} />
        ) : (
          <span className="admin-muted">{AUTOMATION_LANE_OVERALL_STATE_LABELS.chua_co_task}</span>
        )}
      </p>

      <dl className="automation-lane-board__card-meta">
        <div>
          <dt>Việc tiếp theo</dt>
          <dd>{entry.nextAction}</dd>
        </div>
        {entry.blockerReason ? (
          <div>
            <dt>Blocker</dt>
            <dd>{entry.blockerReason}</dd>
          </div>
        ) : null}
        <div>
          <dt>Production</dt>
          <dd>
            <ProductionCell task={entry.task} />
          </dd>
        </div>
        <div>
          <dt>CI / Review</dt>
          <dd>{entry.ciReviewDisplay}</dd>
        </div>
        {entry.task?.linkedPullRequest ? (
          <div>
            <dt>PR</dt>
            <dd>
              <PullRequestCell task={entry.task} />
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
