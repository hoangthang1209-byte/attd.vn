"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import {
  AUTOMATION_OPEN_FILTER_OPTIONS,
  AUTOMATION_RISK_BADGE_CLASS,
  AUTOMATION_RISK_FILTER_OPTIONS,
  AUTOMATION_RISK_LABELS,
  AUTOMATION_STATUS_BADGE_CLASS,
  AUTOMATION_STATUS_FILTER_OPTIONS,
  AUTOMATION_STATUS_LABELS,
} from "@/features/automation/labels";
import type {
  AutomationDashboardResponse,
  AutomationTask,
  AutomationTaskRisk,
  NormalizedTaskStatus,
} from "@/features/automation/automation-task.types";
import { formatQuoteDateTime } from "@/features/quotes/format";

type StatusFilter = NormalizedTaskStatus | "all";
type RiskFilter = AutomationTaskRisk | "all";
type OpenFilter = "all" | "open" | "closed";

function matchesFilters(
  task: AutomationTask,
  statusFilter: StatusFilter,
  riskFilter: RiskFilter,
  openFilter: OpenFilter,
  searchQuery: string,
): boolean {
  if (statusFilter !== "all" && task.status !== statusFilter) return false;
  if (riskFilter !== "all" && task.risk !== riskFilter) return false;
  if (openFilter === "open" && !task.isOpen) return false;
  if (openFilter === "closed" && task.isOpen) return false;

  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  return (
    task.title.toLowerCase().includes(query) ||
    String(task.issueNumber).includes(query) ||
    (task.blockerReason?.toLowerCase().includes(query) ?? false)
  );
}

export default function AutomationDashboardClient() {
  const [data, setData] = useState<AutomationDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [openFilter, setOpenFilter] = useState<OpenFilter>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/automation");
      const json = (await response.json()) as AutomationDashboardResponse & { message?: string };
      if (!response.ok) throw new Error(json.message ?? "Không thể tải dashboard automation");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((task) =>
      matchesFilters(task, statusFilter, riskFilter, openFilter, searchQuery),
    );
  }, [data, openFilter, riskFilter, searchQuery, statusFilter]);

  if (loading) {
    return <AdminLoadingState label="Đang tải dashboard automation…" />;
  }

  if (!data && error) {
    return (
      <AdminPageShell>
        <EmptyState
          title="Không thể tải dashboard automation"
          description={error}
          action={
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Tự động hóa"
        description="Theo dõi task Builder, trạng thái PR/CI và blocker trực tiếp từ GitHub."
        actions={
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Làm mới
          </button>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}

      {!data?.configured ? (
        <EmptyState
          title="Chưa cấu hình GitHub automation"
          description={
            data?.configMessage ??
            "Thiếu token read-only. Xem docs/github-automation-dashboard.md để cấu hình GITHUB_AUTOMATION_READ_TOKEN trên Vercel."
          }
        />
      ) : null}

      {data?.configured && data.configMessage ? (
        <p className="admin-error">{data.configMessage}</p>
      ) : null}

      {data?.configured && data.dataCompleteness?.openTasksTruncated ? (
        <p className="admin-error" role="status">
          Dữ liệu task đang mở chưa đầy đủ: đã tải{" "}
          {data.dataCompleteness.openTasksLoadedCount ?? data.tasks.filter((task) => task.isOpen).length}
          {" / "}
          {data.dataCompleteness.openTasksTotalCount ?? "?"} task theo GitHub Search API (giới hạn 1000 kết
          quả). Các task còn lại không hiển thị.
        </p>
      ) : null}

      {data?.configured ? (
        <>
          <div className="sales-follow-up__stats">
            <StatCard label="Task đang mở" value={data.summary.totalOpen} />
            <StatCard label="Đang build" value={data.summary.building} tone="info" />
            <StatCard
              label="Stalled / Thất bại"
              value={data.summary.stalledOrFailed}
              tone="danger"
            />
            <StatCard label="Cần sửa" value={data.summary.needsFix} tone="warning" />
            <StatCard label="Sẵn sàng merge" value={data.summary.readyToMerge} tone="success" />
            <StatCard label="Merged hôm nay" value={data.summary.mergedToday} />
          </div>

          <div className="admin-data-toolbar">
            <input
              type="search"
              className="admin-input"
              placeholder="Tìm theo issue hoặc tiêu đề…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Tìm task automation"
            />
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Lọc theo trạng thái"
            >
              {AUTOMATION_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="admin-select"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
              aria-label="Lọc theo rủi ro"
            >
              {AUTOMATION_RISK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="sales-follow-up__filters" role="tablist" aria-label="Lọc mở/đóng">
              {AUTOMATION_OPEN_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={openFilter === option.value}
                  className={`admin-btn admin-btn--xs${openFilter === option.value ? " admin-btn--primary" : ""}`}
                  onClick={() => setOpenFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              title="Không có task phù hợp"
              description="Không tìm thấy task automation theo bộ lọc hiện tại."
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact sales-follow-up__table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Tiêu đề</th>
                    <th>Trạng thái</th>
                    <th>Rủi ro</th>
                    <th>PR</th>
                    <th>Cập nhật</th>
                    <th>Blocker</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <AutomationTaskRow
                      key={task.issueNumber}
                      task={task}
                      expanded={expandedIssue === task.issueNumber}
                      onToggle={() =>
                        setExpandedIssue((current) =>
                          current === task.issueNumber ? null : task.issueNumber,
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="admin-muted">
            Cập nhật lúc {data.fetchedAt ? formatQuoteDateTime(data.fetchedAt) : "—"} · cache 60 giây
          </p>
        </>
      ) : null}
    </AdminPageShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "info" | "success";
}) {
  return (
    <article className={`sales-follow-up__stat-card${tone ? ` sales-follow-up__stat-card--${tone}` : ""}`}>
      <span className="sales-follow-up__stat-label">{label}</span>
      <strong className="sales-follow-up__stat-value">{value}</strong>
    </article>
  );
}

function AutomationTaskRow({
  task,
  expanded,
  onToggle,
}: {
  task: AutomationTask;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td>
          <Link href={task.githubIssueUrl} className="admin-link" target="_blank" rel="noreferrer">
            #{task.issueNumber}
          </Link>
        </td>
        <td className="sales-follow-up__title-cell">
          <strong>{task.title}</strong>
        </td>
        <td>
          <span className={AUTOMATION_STATUS_BADGE_CLASS[task.status]}>
            {AUTOMATION_STATUS_LABELS[task.status]}
          </span>
        </td>
        <td>
          <span className={AUTOMATION_RISK_BADGE_CLASS[task.risk]}>
            {AUTOMATION_RISK_LABELS[task.risk]}
          </span>
        </td>
        <td>
          {task.linkedPullRequest ? (
            <Link
              href={task.linkedPullRequest.url}
              className="admin-link"
              target="_blank"
              rel="noreferrer"
            >
              PR #{task.linkedPullRequest.number}
              {task.linkedPullRequest.merged
                ? " (merged)"
                : task.linkedPullRequest.state === "open"
                  ? " (open)"
                  : " (closed)"}
            </Link>
          ) : (
            "—"
          )}
        </td>
        <td>{formatQuoteDateTime(task.latestUpdateAt)}</td>
        <td className="sales-follow-up__reason">{task.blockerReason ?? "—"}</td>
        <td>
          <button type="button" className="admin-btn admin-btn--xs admin-btn--secondary" onClick={onToggle}>
            {expanded ? "Thu gọn" : "Chi tiết"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={8}>
            <div className="admin-panel">
              <p>
                <strong>GitHub issue:</strong>{" "}
                <Link href={task.githubIssueUrl} target="_blank" rel="noreferrer">
                  #{task.issueNumber}
                </Link>
              </p>
              {task.linkedPullRequest ? (
                <p>
                  <strong>PR liên kết:</strong>{" "}
                  <Link href={task.linkedPullRequest.url} target="_blank" rel="noreferrer">
                    #{task.linkedPullRequest.number} — {task.linkedPullRequest.title}
                  </Link>
                </p>
              ) : (
                <p>
                  <strong>PR liên kết:</strong> chưa có PR open/linked
                </p>
              )}
              <p>
                <strong>Trạng thái CI/Reviewer:</strong>{" "}
                {task.statusLabel ?? "—"}
                {task.status === "ready_to_merge" ? " · READY TO MERGE" : ""}
              </p>
              <p>
                <strong>Blocker:</strong> {task.blockerReason ?? "Không có"}
              </p>
              <p>
                <strong>Cập nhật gần nhất:</strong> {formatQuoteDateTime(task.latestUpdateAt)}
              </p>
              {task.recentStatusComments.length > 0 ? (
                <div>
                  <strong>Bình luận trạng thái gần đây</strong>
                  <ul>
                    {task.recentStatusComments.map((comment) => (
                      <li key={`${comment.createdAt}-${comment.author}`}>
                        <span className="admin-muted">
                          {formatQuoteDateTime(comment.createdAt)} · {comment.author}
                        </span>
                        <div>{comment.body.split("\n")[0]}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
