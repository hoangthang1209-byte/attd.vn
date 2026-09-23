"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutomationLaneBoard from "@/components/admin/automation/AutomationLaneBoard";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import {
  collectTaskAreaFilterOptions,
  matchesAutomationTaskFilters,
  type AutomationOpenFilter,
  type AutomationRiskFilter,
  type AutomationStatusFilter,
  type AutomationTaskAreaFilter,
} from "@/features/automation/automation-dashboard.filters";
import {
  AUTOMATION_DASHBOARD_VIEW_OPTIONS,
  defaultOpenFilterForView,
  shouldShowTaskInCompletedDefaultList,
  type AutomationDashboardView,
} from "@/features/automation/automation-dashboard.views";
import {
  AUTOMATION_OPEN_FILTER_OPTIONS,
  AUTOMATION_RISK_BADGE_CLASS,
  AUTOMATION_RISK_FILTER_OPTIONS,
  AUTOMATION_RISK_LABELS,
  AUTOMATION_STATUS_BADGE_CLASS,
  AUTOMATION_PRODUCTION_STATUS_BADGE_CLASS,
  AUTOMATION_PRODUCTION_STATUS_LABELS,
  AUTOMATION_STATUS_FILTER_OPTIONS,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_PR_STATE_SUFFIX,
} from "@/features/automation/labels";
import type {
  AutomationDashboardResponse,
  AutomationSummaryMetric,
  AutomationTask,
} from "@/features/automation/automation-task.types";
import { createDashboardFetchSequencer } from "@/features/automation/automation-dashboard-fetch";
import { formatShortCommitSha } from "@/features/automation/automation-production";
import { formatQuoteDateTime } from "@/features/quotes/format";

const AUTO_REFRESH_INTERVAL_MS = 45_000;
const AUTO_REFRESH_LABEL = "Tự cập nhật ~45 giây";

type LoadOptions = {
  background?: boolean;
};

export default function AutomationDashboardClient() {
  const [view, setView] = useState<AutomationDashboardView>("active");
  const [data, setData] = useState<AutomationDashboardResponse | null>(null);
  const [activeLaneData, setActiveLaneData] = useState<AutomationDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AutomationStatusFilter>("all");
  const [riskFilter, setRiskFilter] = useState<AutomationRiskFilter>("all");
  const [openFilter, setOpenFilter] = useState<AutomationOpenFilter>("open");
  const [taskAreaFilter, setTaskAreaFilter] = useState<AutomationTaskAreaFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const fetchSequencerRef = useRef(createDashboardFetchSequencer());
  const foregroundAbortRef = useRef<AbortController | null>(null);
  const viewRef = useRef<AutomationDashboardView>("active");
  const hasLoadedDataRef = useRef(false);
  const laneConfiguredRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    hasLoadedDataRef.current = data !== null;
  }, [data]);

  useEffect(() => {
    laneConfiguredRef.current = activeLaneData?.configured ?? data?.configured ?? false;
  }, [activeLaneData?.configured, data?.configured]);

  const applyDashboardPayload = useCallback(
    (targetView: AutomationDashboardView, json: AutomationDashboardResponse) => {
      if (targetView === "active") {
        setActiveLaneData(json);
      }

      if (targetView === viewRef.current) {
        setData(json);
      }
    },
    [],
  );

  const load = useCallback(async (targetView: AutomationDashboardView, options: LoadOptions = {}) => {
    const { background = false } = options;
    const ticket = fetchSequencerRef.current.beginRequest(
      targetView,
      background ? "background" : "foreground",
    );
    if (!ticket) return;

    let abortController: AbortController | null = null;
    if (!background) {
      foregroundAbortRef.current?.abort();
      abortController = new AbortController();
      foregroundAbortRef.current = abortController;

      if (hasLoadedDataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setRefreshWarning(null);
    }

    try {
      const response = await fetch(`/api/admin/automation?view=${targetView}`, {
        signal: abortController?.signal,
      });
      const json = (await response.json()) as AutomationDashboardResponse & { message?: string };
      if (!response.ok) throw new Error(json.message ?? "Không thể tải dashboard automation");

      if (!fetchSequencerRef.current.shouldApplyResponse(ticket, viewRef.current)) {
        return;
      }

      applyDashboardPayload(targetView, json);
      setRefreshWarning(null);
      if (!background) setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      const message = err instanceof Error ? err.message : "Lỗi tải dữ liệu";
      if (background) {
        setRefreshWarning(`Không thể tự cập nhật: ${message}. Đang hiển thị dữ liệu lần tải trước.`);
      } else if (fetchSequencerRef.current.shouldApplyResponse(ticket, viewRef.current)) {
        setError(message);
        setData(null);
        if (targetView === "active") {
          setActiveLaneData(null);
        }
      }
    } finally {
      fetchSequencerRef.current.endRequest(ticket);
      if (!background && fetchSequencerRef.current.isLatestForegroundRequest(ticket)) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyDashboardPayload]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const handleViewChange = useCallback(
    (nextView: AutomationDashboardView) => {
      setView(nextView);
      setOpenFilter(defaultOpenFilterForView(nextView));
      setStatusFilter("all");
      setExpandedIssue(null);
      void loadRef.current(nextView);
    },
    [],
  );

  const handleManualRefresh = useCallback(() => {
    void loadRef.current(viewRef.current);
  }, []);

  const handleLaneBackgroundRefresh = useCallback(() => {
    void loadRef.current("active", { background: true });
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadRef.current("active");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!laneConfiguredRef.current) return;

    const scheduleRefresh = () => {
      if (document.hidden) return;
      void loadRef.current("active", { background: true });
    };

    const onVisibilityChange = () => {
      if (!document.hidden) scheduleRefresh();
    };

    const intervalId = window.setInterval(scheduleRefresh, AUTO_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeLaneData?.configured, data?.configured]);

  const taskAreaFilterOptions = useMemo(
    () => (data ? collectTaskAreaFilterOptions(data.tasks) : []),
    [data],
  );

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((task) => {
      if (
        view === "completed" &&
        !shouldShowTaskInCompletedDefaultList(task, statusFilter)
      ) {
        return false;
      }
      return matchesAutomationTaskFilters(task, {
        statusFilter,
        riskFilter,
        openFilter,
        taskAreaFilter,
        searchQuery,
      });
    });
  }, [data, openFilter, riskFilter, searchQuery, statusFilter, taskAreaFilter, view]);

  const filteredIssueNumbers = useMemo(
    () => new Set(filteredTasks.map((task) => task.issueNumber)),
    [filteredTasks],
  );

  const canScrollToLaneTask = useCallback(
    (issueNumber: number) => filteredIssueNumbers.has(issueNumber),
    [filteredIssueNumbers],
  );

  const handleLaneTaskScroll = useCallback(
    (issueNumber: number) => {
      if (!filteredIssueNumbers.has(issueNumber)) return;
      setExpandedIssue(issueNumber);
      const row = document.getElementById(`automation-task-${issueNumber}`);
      row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [filteredIssueNumbers],
  );

  const laneBoardData = activeLaneData ?? (view === "active" ? data : null);
  const laneWriteActionConfigured =
    laneBoardData?.writeActionConfigured ?? data?.writeActionConfigured ?? false;
  const laneWriteActionConfigMessage =
    laneBoardData?.writeActionConfigMessage ?? data?.writeActionConfigMessage ?? null;

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
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => void loadRef.current(view)}
            >
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
        description="Trung tâm điều khiển task phát triển: theo dõi công việc đang chạy, toàn bộ lịch sử và task đã hoàn tất từ GitHub."
        actions={
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={handleManualRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
          >
            {refreshing ? "Đang làm mới…" : "Làm mới"}
          </button>
        }
      />

      {refreshing ? (
        <p className="admin-muted" role="status">
          Đang làm mới dữ liệu…
        </p>
      ) : null}

      {error ? <p className="admin-error">{error}</p> : null}
      {refreshWarning ? (
        <p className="admin-error" role="status">
          {refreshWarning}
        </p>
      ) : null}

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
          quả). Các task còn lại không hiển thị. Số liệu theo trạng thái (trừ tổng mở) chỉ phản ánh phần
          đã tải.
        </p>
      ) : null}

      {data?.configured && view === "active" && data.dataCompleteness?.closedHistoryUnavailable ? (
        <p className="admin-error" role="status">
          Không thể tải lịch sử task đã đóng (merged/superseded 30 ngày). Dữ liệu task đang mở vẫn hiển thị;
          số liệu &quot;Đã merge hôm nay&quot; có thể thiếu.
        </p>
      ) : null}

      {data?.configured && data.dataCompleteness?.historyTruncated ? (
        <p className="admin-error" role="status">
          Lịch sử task chưa đầy đủ: đã tải {data.dataCompleteness.historyLoadedCount ?? data.tasks.length} issue
          {data.dataCompleteness.historyTotalCount
            ? ` / ${data.dataCompleteness.historyTotalCount}`
            : ""}{" "}
          (giới hạn phân trang GitHub REST). Các task cũ hơn có thể chưa hiển thị.
        </p>
      ) : null}

      {data?.configured && data.dataCompleteness?.taskAreaRecognitionTruncated ? (
        <p className="admin-error" role="status">
          Nhận diện TASK_AREA chưa đầy đủ: đã kiểm tra bình luận cho{" "}
          {data.dataCompleteness.unlabeledCommentChecksPerformed ?? "?"} issue chưa gắn nhãn
          {typeof data.dataCompleteness.unlabeledCommentChecksSkipped === "number" &&
          data.dataCompleteness.unlabeledCommentChecksSkipped > 0
            ? `, bỏ qua ${data.dataCompleteness.unlabeledCommentChecksSkipped} issue còn lại (giới hạn an toàn).`
            : "."}{" "}
          Các task chỉ có TASK_AREA trên issue chưa được kiểm tra có thể chưa hiển thị.
        </p>
      ) : null}

      {data?.configured &&
      (data.dataCompleteness?.recognitionDegraded ||
        (data.dataCompleteness?.commentLookupFailedCount ?? 0) > 0) ? (
        <p className="admin-error" role="status">
          Một số bình luận GitHub không tải được (
          {data.dataCompleteness?.commentLookupFailedCount ?? "?"} lần thất bại). Danh sách task có thể thiếu
          các issue chỉ nhận diện qua TASK_AREA.
        </p>
      ) : null}

      {data?.configured ? (
        <>
          {laneBoardData ? (
            <AutomationLaneBoard
              tasks={laneBoardData.tasks}
              lastUpdatedAt={laneBoardData.fetchedAt}
              autoRefreshLabel={AUTO_REFRESH_LABEL}
              writeActionConfigured={laneWriteActionConfigured}
              writeActionConfigMessage={laneWriteActionConfigMessage}
              onScrollToTask={handleLaneTaskScroll}
              canScrollToTask={canScrollToLaneTask}
              onRefresh={handleLaneBackgroundRefresh}
            />
          ) : null}

          <div className="sales-follow-up__filters" role="tablist" aria-label="Chế độ xem task">
            {AUTOMATION_DASHBOARD_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={view === option.value}
                className={`admin-btn admin-btn--sm${view === option.value ? " admin-btn--primary" : ""}`}
                onClick={() => handleViewChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {view === "active" ? (
            <div className="sales-follow-up__stats">
              <StatCard label="Task đang mở" metric={data.summary.totalOpen} />
              <StatCard label="Đang build" metric={data.summary.building} tone="info" />
              <StatCard label="Tạm dừng / Thất bại" metric={data.summary.stalledOrFailed} tone="danger" />
              <StatCard label="Cần sửa" metric={data.summary.needsFix} tone="warning" />
              <StatCard label="Sẵn sàng merge" metric={data.summary.readyToMerge} tone="success" />
              <StatCard label="Đã merge hôm nay" metric={data.summary.mergedToday} />
            </div>
          ) : (
            <p className="admin-muted" role="status">
              {view === "all"
                ? `Hiển thị ${data.tasks.length} task đã nhận diện trong repo.`
                : `Hiển thị ${data.tasks.length} task đã hoàn tất (merged/thất bại). Chọn trạng thái "Đã thay thế" để xem task superseded.`}
            </p>
          )}

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
              onChange={(event) => setStatusFilter(event.target.value as AutomationStatusFilter)}
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
              onChange={(event) => setRiskFilter(event.target.value as AutomationRiskFilter)}
              aria-label="Lọc theo rủi ro"
            >
              {AUTOMATION_RISK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="admin-select"
              value={taskAreaFilter}
              onChange={(event) => setTaskAreaFilter(event.target.value as AutomationTaskAreaFilter)}
              aria-label="Lọc theo mảng"
            >
              <option value="all">Tất cả mảng</option>
              {taskAreaFilterOptions.map((option) => (
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
            <>
              <div className="admin-table-wrap automation-task-table-wrap">
                <table className="admin-table admin-table--compact sales-follow-up__table automation-task-table">
                  <thead>
                    <tr>
                      <th>Vấn đề</th>
                      <th>Mảng</th>
                      <th>Tiêu đề</th>
                      <th>Trạng thái</th>
                      <th className="automation-task-table__optional">Rủi ro</th>
                      <th>PR liên kết</th>
                      <th>Production</th>
                      <th>Cập nhật</th>
                      <th className="automation-task-table__optional">Blocker</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <AutomationTaskRow
                        key={task.issueNumber}
                        id={`automation-task-${task.issueNumber}`}
                        task={task}
                        productionCommitSha={data.productionCommitSha}
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
              <div className="automation-task-cards">
                {filteredTasks.map((task) => (
                  <AutomationTaskCard
                    key={task.issueNumber}
                    task={task}
                    productionCommitSha={data.productionCommitSha}
                    expanded={expandedIssue === task.issueNumber}
                    onToggle={() =>
                      setExpandedIssue((current) =>
                        current === task.issueNumber ? null : task.issueNumber,
                      )
                    }
                  />
                ))}
              </div>
            </>
          )}

          <p className="admin-muted">
            Cập nhật lúc {data.fetchedAt ? formatQuoteDateTime(data.fetchedAt) : "—"} · bộ nhớ đệm 60 giây
            {laneBoardData ? ` · ${AUTO_REFRESH_LABEL}` : ""}
            {data.productionCommitSha ? (
              <>
                {" "}
                · Production SHA: {formatShortCommitSha(data.productionCommitSha)}
                {data.productionCheckedAt
                  ? ` (kiểm tra ${formatQuoteDateTime(data.productionCheckedAt)})`
                  : null}
              </>
            ) : (
              " · Production SHA: không xác định (chỉ có trên Vercel Production)"
            )}
          </p>
        </>
      ) : null}
    </AdminPageShell>
  );
}

function formatSummaryMetric(metric: AutomationSummaryMetric): string {
  if (!metric.isPartial) return String(metric.value);
  return `${metric.value}+`;
}

function StatCard({
  label,
  metric,
  tone,
}: {
  label: string;
  metric: AutomationSummaryMetric;
  tone?: "danger" | "warning" | "info" | "success";
}) {
  const displayValue = formatSummaryMetric(metric);
  const partialHint = metric.isPartial ? " (một phần)" : "";

  return (
    <article className={`sales-follow-up__stat-card${tone ? ` sales-follow-up__stat-card--${tone}` : ""}`}>
      <span className="sales-follow-up__stat-label">
        {label}
        {partialHint}
      </span>
      <strong className="sales-follow-up__stat-value" title={metric.isPartial ? "Số liệu chưa đầy đủ" : undefined}>
        {displayValue}
      </strong>
    </article>
  );
}

function ProductionStatusBadge({ task }: { task: AutomationTask }) {
  const { productionStatus } = task;
  const label = AUTOMATION_PRODUCTION_STATUS_LABELS[productionStatus.status];
  const badgeClass = AUTOMATION_PRODUCTION_STATUS_BADGE_CLASS[productionStatus.status];
  const title = productionStatus.reason ?? undefined;

  return (
    <span className={badgeClass} title={title}>
      {label}
    </span>
  );
}

function AutomationTaskDetails({
  task,
  productionCommitSha,
}: {
  task: AutomationTask;
  productionCommitSha: string | null;
}) {
  return (
    <div className="admin-panel automation-task-card__details">
      <p>
        <strong>Mảng:</strong> {task.taskArea}
      </p>
      <p>
        <strong>Production:</strong>{" "}
        {AUTOMATION_PRODUCTION_STATUS_LABELS[task.productionStatus.status]}
        {task.productionStatus.mergedCommitSha ? (
          <> · Merge SHA: {formatShortCommitSha(task.productionStatus.mergedCommitSha)}</>
        ) : null}
        {productionCommitSha ? (
          <> · Production SHA: {formatShortCommitSha(productionCommitSha)}</>
        ) : null}
        {task.productionStatus.reason ? <> · {task.productionStatus.reason}</> : null}
        {task.productionStatus.checkedAt ? (
          <> · Kiểm tra lúc {formatQuoteDateTime(task.productionStatus.checkedAt)}</>
        ) : null}
      </p>
      <p>
        <strong>Rủi ro:</strong>{" "}
        <span className={AUTOMATION_RISK_BADGE_CLASS[task.risk]}>
          {AUTOMATION_RISK_LABELS[task.risk]}
        </span>
      </p>
      <p>
        <strong>Vấn đề GitHub:</strong>{" "}
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
          <strong>PR liên kết:</strong> chưa có PR liên kết hoặc chưa tải
        </p>
      )}
      <p>
        <strong>Trạng thái CI / Review:</strong> {task.statusLabel ?? "—"}
        {task.status === "ready_to_merge" ? " · Sẵn sàng merge" : ""}
      </p>
      <p>
        <strong>Điểm chặn:</strong> {task.blockerReason ?? "Không có"}
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
  );
}

function AutomationTaskCard({
  task,
  expanded,
  onToggle,
  productionCommitSha,
}: {
  task: AutomationTask;
  expanded: boolean;
  onToggle: () => void;
  productionCommitSha: string | null;
}) {
  return (
    <article className="automation-task-card">
      <div className="automation-task-card__header">
        <Link href={task.githubIssueUrl} className="admin-link" target="_blank" rel="noreferrer">
          #{task.issueNumber}
        </Link>
        <span className={AUTOMATION_STATUS_BADGE_CLASS[task.status]}>
          {AUTOMATION_STATUS_LABELS[task.status]}
        </span>
      </div>
      <p className="automation-task-card__area">
        <span className="admin-status-badge admin-status-badge--neutral">{task.taskArea}</span>
      </p>
      <p className="automation-task-card__title">
        <strong>{task.title}</strong>
      </p>
      <p className="automation-task-card__meta">
        <ProductionStatusBadge task={task} />
        {" · "}
        {task.linkedPullRequest ? (
          <Link href={task.linkedPullRequest.url} className="admin-link" target="_blank" rel="noreferrer">
            PR #{task.linkedPullRequest.number}
          </Link>
        ) : (
          "Chưa có PR"
        )}
        {" · "}
        {formatQuoteDateTime(task.latestUpdateAt)}
      </p>
      <button type="button" className="admin-btn admin-btn--xs admin-btn--secondary" onClick={onToggle}>
        {expanded ? "Thu gọn" : "Chi tiết"}
      </button>
      {expanded ? (
        <AutomationTaskDetails task={task} productionCommitSha={productionCommitSha} />
      ) : null}
    </article>
  );
}

function AutomationTaskRow({
  id,
  task,
  expanded,
  onToggle,
  productionCommitSha,
}: {
  id: string;
  task: AutomationTask;
  expanded: boolean;
  onToggle: () => void;
  productionCommitSha: string | null;
}) {
  return (
    <>
      <tr id={id}>
        <td>
          <Link href={task.githubIssueUrl} className="admin-link" target="_blank" rel="noreferrer">
            #{task.issueNumber}
          </Link>
        </td>
        <td className="sales-follow-up__area-cell" title={task.taskArea}>
          <span className="admin-status-badge admin-status-badge--neutral">{task.taskArea}</span>
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
                ? AUTOMATION_PR_STATE_SUFFIX.merged
                : task.linkedPullRequest.state === "open"
                  ? AUTOMATION_PR_STATE_SUFFIX.open
                  : AUTOMATION_PR_STATE_SUFFIX.closed}
            </Link>
          ) : (
            "—"
          )}
        </td>
        <td className="sales-follow-up__production-cell">
          <ProductionStatusBadge task={task} />
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
          <td colSpan={10}>
            <AutomationTaskDetails task={task} productionCommitSha={productionCommitSha} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
