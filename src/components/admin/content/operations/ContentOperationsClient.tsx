"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import styles from "@/components/admin/content/operations/Operations.module.css";
import OperationsPipeline from "@/components/admin/content/operations/OperationsPipeline";
import OperationsKanban from "@/components/admin/content/operations/OperationsKanban";
import OperationsCalendar from "@/components/admin/content/operations/OperationsCalendar";
import OperationsHealthCard from "@/components/admin/content/operations/OperationsHealthCard";
import OperationsRefreshQueue from "@/components/admin/content/operations/OperationsRefreshQueue";
import OperationsOwners from "@/components/admin/content/operations/OperationsOwners";
import OperationsCampaigns from "@/components/admin/content/operations/OperationsCampaigns";
import OperationsClusters from "@/components/admin/content/operations/OperationsClusters";
import OperationsFilterBar from "@/components/admin/content/operations/OperationsFilterBar";
import OperationsSearch from "@/components/admin/content/operations/OperationsSearch";
import OperationsQuickActions from "@/components/admin/content/operations/OperationsQuickActions";
import OperationsReviewQueue from "@/components/admin/content/operations/OperationsReviewQueue";
import OperationsPublishQueue from "@/components/admin/content/operations/OperationsPublishQueue";
import OperationsSeoOps from "@/components/admin/content/operations/OperationsSeoOps";
import OperationsMediaCoverage from "@/components/admin/content/operations/OperationsMediaCoverage";
import OperationsKnowledgeCoverage from "@/components/admin/content/operations/OperationsKnowledgeCoverage";
import OperationsRightRail from "@/components/admin/content/operations/OperationsRightRail";
import OperationsReviewInbox from "@/components/admin/content/operations/OperationsReviewInbox";
import OperationsPublishInbox from "@/components/admin/content/operations/OperationsPublishInbox";
import OperationsRefreshInbox from "@/components/admin/content/operations/OperationsRefreshInbox";
import OperationsReviewerWorkload from "@/components/admin/content/operations/OperationsReviewerWorkload";
import OperationsPublishOps from "@/components/admin/content/operations/OperationsPublishOps";
import OperationsRefreshCampaigns from "@/components/admin/content/operations/OperationsRefreshCampaigns";
import OperationsEditorLoad from "@/components/admin/content/operations/OperationsEditorLoad";
import OperationsNamedViews from "@/components/admin/content/operations/OperationsNamedViews";
import OperationsTopicTimeline from "@/components/admin/content/operations/OperationsTopicTimeline";
import {
  buildDeepLink,
  filterOperationsTopics,
  searchOperationsTopics,
} from "@/features/content/operations/content-operations.mapping";
import {
  OPERATIONS_PIPELINE_COLUMNS,
  REVIEW_INBOX_GROUP_KEYS,
  PUBLISH_INBOX_GROUP_KEYS,
  type ContentOperationsCommandCenter,
  type OperationsCalendarView,
  type OperationsFilters,
  type OperationsInboxTab,
  type OperationsNamedView,
  type OperationsPipelineColumnKey,
  type OpsTopicCard,
  type PublishInboxGroupKey,
  type ReviewInboxGroupKey,
} from "@/features/content/operations/content-operations.types";

const MAIN_TABS: Array<{ key: OperationsInboxTab; label: string }> = [
  { key: "kanban", label: "Kanban" },
  { key: "calendar", label: "Lịch" },
  { key: "review", label: "Kiểm duyệt" },
  { key: "publish", label: "Xuất bản" },
  { key: "refresh", label: "Làm mới" },
];

function isReviewGroupKey(v: string): v is ReviewInboxGroupKey {
  return (REVIEW_INBOX_GROUP_KEYS as readonly string[]).includes(v);
}

function isPublishGroupKey(v: string): v is PublishInboxGroupKey {
  return (PUBLISH_INBOX_GROUP_KEYS as readonly string[]).includes(v);
}

function isInboxTab(v: string): v is OperationsInboxTab {
  return v === "kanban" || v === "calendar" || v === "review" || v === "publish" || v === "refresh";
}

function isCalendarView(v: string): v is OperationsCalendarView {
  return v === "month" || v === "week" || v === "agenda";
}

function Section({
  id,
  title,
  meta,
  children,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          {open ? "▾" : "▸"} {title}
        </span>
        {meta ? <span className={styles.sectionHeaderMeta}>{meta}</span> : null}
      </button>
      {open ? <div className={styles.sectionBody}>{children}</div> : null}
    </section>
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Reads a shallow query-string snapshot without pulling in next/navigation (avoids a Suspense boundary requirement for a client-only, no-SSR-data page). */
function readDeepLinkQuery(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function writeDeepLinkQuery(query: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = "";
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", url.toString());
}

/**
 * Read-only operational cockpit — no workflow mutations. The command-center
 * summary is fetched once for kanban/health/pipeline; the review, publish,
 * refresh, and calendar tabs each lazily fetch their own bounded endpoint
 * only when opened (Sprint 17.1), so opening this page never re-triggers the
 * summary fetch and each inbox loads independently.
 */
export default function ContentOperationsClient() {
  const toast = useAdminToast();
  const [summary, setSummary] = useState<ContentOperationsCommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OperationsFilters>({});
  const [search, setSearch] = useState("");
  const [mainView, setMainView] = useState<OperationsInboxTab>("kanban");
  const [reviewGroup, setReviewGroup] = useState<ReviewInboxGroupKey | null>(null);
  const [publishGroup, setPublishGroup] = useState<PublishInboxGroupKey | null>(null);
  const [calendarView, setCalendarView] = useState<OperationsCalendarView | undefined>(undefined);
  const [timelineTopicId, setTimelineTopicId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/operations/summary", { cache: "no-store" });
      const json = (await res.json()) as { summary?: ContentOperationsCommandCenter; message?: string };
      if (!res.ok || !json.summary) throw new Error(json.message ?? "Không tải được trung tâm vận hành nội dung");
      setSummary(json.summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải được trung tâm vận hành nội dung";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep-link intake — runs once on mount: `?inbox=review|publish|refresh|calendar|kanban&group=...&filter=...&view=...`.
  useEffect(() => {
    const query = readDeepLinkQuery();
    if (query.inbox && isInboxTab(query.inbox)) setMainView(query.inbox);
    if (query.group) {
      if (isReviewGroupKey(query.group)) setReviewGroup(query.group);
      if (isPublishGroupKey(query.group)) setPublishGroup(query.group);
    }
    if (query.view && isCalendarView(query.view)) setCalendarView(query.view);
    if (query.filter) {
      const key = query.filter as keyof OperationsFilters;
      setFilters((prev) => ({ ...prev, [key]: true }) as OperationsFilters);
      if (!query.inbox) setMainView("kanban");
    }
  }, []);

  const cards: OpsTopicCard[] = useMemo(() => summary?.topics ?? [], [summary]);

  const facetFiltered = useMemo(() => filterOperationsTopics(cards, filters), [cards, filters]);
  const filtered = useMemo(() => searchOperationsTopics(facetFiltered, search), [facetFiltered, search]);

  const kanban = useMemo(() => {
    const groups = {} as Record<OperationsPipelineColumnKey, OpsTopicCard[]>;
    for (const col of OPERATIONS_PIPELINE_COLUMNS) groups[col.key] = [];
    for (const card of filtered) groups[card.pipelineColumn].push(card);
    return groups;
  }, [filtered]);

  const pipelineSummary = useMemo(
    () =>
      OPERATIONS_PIPELINE_COLUMNS.map((col) => ({
        key: col.key,
        label: col.label,
        count: kanban[col.key].length,
        topicIds: kanban[col.key].map((c) => c.id),
      })),
    [kanban],
  );

  const activeHealthFilter = useMemo(() => {
    const flagKeys: Array<keyof OperationsFilters> = [
      "missingCta",
      "missingMeta",
      "missingMedia",
      "missingFaq",
      "overdue",
      "blocked",
      "needsRefresh",
    ];
    return flagKeys.find((key) => filters[key]) ?? null;
  }, [filters]);

  /** Health metrics are deep-link keys under the hood — clicking one both applies the facet filter and updates the shareable URL. */
  const handleHealthSelect = (hrefFilter: string) => {
    const key = hrefFilter as keyof OperationsFilters;
    const turningOn = !filters[key];
    setFilters((prev) => ({ ...prev, [key]: prev[key] ? undefined : true }) as OperationsFilters);
    setMainView("kanban");
    const deepLink = buildDeepLink(hrefFilter);
    writeDeepLinkQuery(turningOn ? deepLink.query : {});
  };

  const handlePipelineSelect = (column: OperationsPipelineColumnKey | undefined) => {
    setFilters((prev) => ({ ...prev, pipelineColumn: column }));
  };

  const handleApplyNamedView = (view: OperationsNamedView) => {
    setMainView(view.inbox);
    setFilters(view.filters);
    setReviewGroup(view.group && isReviewGroupKey(view.group) ? view.group : null);
    setPublishGroup(view.group && isPublishGroupKey(view.group) ? view.group : null);
    writeDeepLinkQuery({ inbox: view.inbox, ...(view.group ? { group: view.group } : {}) });
  };

  const handleMainTabChange = (tab: OperationsInboxTab) => {
    setMainView(tab);
    writeDeepLinkQuery({ inbox: tab });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const { dueTodayCount, overdueCount } = useMemo(() => {
    const today = startOfDay(new Date());
    let dueToday = 0;
    let overdue = 0;
    for (const card of cards) {
      if (card.flags.overdue) overdue += 1;
      if (card.dueDate && startOfDay(new Date(card.dueDate)).getTime() === today.getTime()) dueToday += 1;
    }
    return { dueTodayCount: dueToday, overdueCount: overdue };
  }, [cards]);

  if (loading) {
    return (
      <>
        <AdminPageTitle title="Trung tâm vận hành" />
        <AdminLoadingState label="Đang tải trung tâm vận hành nội dung…" rows={6} />
      </>
    );
  }

  if (error || !summary) {
    return (
      <>
        <AdminPageTitle title="Trung tâm vận hành" />
        <EmptyState
          tone="error"
          title="Không tải được trung tâm vận hành"
          description={error ?? "Không có dữ liệu"}
          action={
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      </>
    );
  }

  return (
    <>
      <AdminPageTitle title="Trung tâm vận hành" />
      <div className={styles.shell}>
        <p className="admin-field-hint" style={{ margin: 0 }}>
          Cockpit vận hành nội dung — chỉ xem, không thay đổi trạng thái Topic / Brief / Writing / Review / Publish.
          Cập nhật lần cuối: {new Date(summary.generatedAt).toLocaleString("vi-VN")}
        </p>

        <div className={styles.toolbar}>
          <OperationsQuickActions onScrollTo={scrollTo} />
          <div className={styles.toolbarGroup}>
            <OperationsSearch value={search} onChange={setSearch} />
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
              Tải lại
            </button>
          </div>
        </div>

        <OperationsNamedViews currentInbox={mainView} currentFilters={filters} currentGroup={reviewGroup ?? publishGroup} onApply={handleApplyNamedView} />

        <OperationsFilterBar filters={filters} onChange={setFilters} filtersMeta={summary.filtersMeta} />

        <OperationsPipeline
          entries={pipelineSummary}
          activeColumn={filters.pipelineColumn}
          onSelect={handlePipelineSelect}
        />

        <div className={styles.mainGrid}>
          <div>
            <div className={styles.mainTabs}>
              {MAIN_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={mainView === tab.key ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
                  onClick={() => handleMainTabChange(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {mainView === "kanban" ? <OperationsKanban kanban={kanban} /> : null}
            {mainView === "calendar" ? <OperationsCalendar initialView={calendarView} /> : null}
            {mainView === "review" ? (
              <OperationsReviewInbox initialGroup={reviewGroup} onOpenTimeline={setTimelineTopicId} searchQuery={search} />
            ) : null}
            {mainView === "publish" ? <OperationsPublishInbox initialGroup={publishGroup} searchQuery={search} /> : null}
            {mainView === "refresh" ? <OperationsRefreshInbox searchQuery={search} /> : null}
          </div>

          <OperationsRightRail
            pipeline={pipelineSummary}
            reviewQueue={summary.reviewQueue}
            publishQueue={summary.publishQueue}
            activity={summary.activity}
            dueTodayCount={dueTodayCount}
            overdueCount={overdueCount}
          />
        </div>

        <Section id="ops-health" title="Sức khỏe nội dung" meta={`${filtered.length} / ${cards.length} chủ đề`}>
          <OperationsHealthCard metrics={summary.health} activeFilter={activeHealthFilter} onSelect={handleHealthSelect} />
        </Section>

        <Section id="ops-refresh-queue" title="Cần làm mới" meta={`${summary.refreshQueue.length} bài`}>
          <OperationsRefreshQueue items={summary.refreshQueue} />
        </Section>

        <Section id="ops-owners" title="Theo người phụ trách">
          <OperationsOwners owners={summary.owners} />
        </Section>

        <Section id="ops-editor-load" title="Tải công việc biên tập" defaultOpen={false}>
          <OperationsEditorLoad topics={cards} />
        </Section>

        <Section id="ops-reviewer-workload" title="Tải trọng người duyệt" defaultOpen={false}>
          <OperationsReviewerWorkload />
        </Section>

        <Section id="ops-publish-ops" title="Thống kê xuất bản" defaultOpen={false}>
          <OperationsPublishOps />
        </Section>

        <Section id="ops-refresh-campaigns" title="Chiến dịch cần làm mới" defaultOpen={false}>
          <OperationsRefreshCampaigns />
        </Section>

        <Section id="ops-campaigns" title="Theo chiến dịch">
          <OperationsCampaigns campaigns={summary.campaigns} />
        </Section>

        <Section id="ops-clusters" title="Cụm chủ đề" defaultOpen={false}>
          <OperationsClusters clusters={summary.clusters} />
        </Section>

        <Section id="ops-review" title="Kiểm duyệt (tóm tắt)" defaultOpen={false}>
          <OperationsReviewQueue summary={summary.reviewQueue} />
        </Section>

        <Section id="ops-publish" title="Xuất bản (tóm tắt)" defaultOpen={false}>
          <OperationsPublishQueue summary={summary.publishQueue} />
        </Section>

        <Section id="ops-seo" title="SEO Ops" defaultOpen={false}>
          <OperationsSeoOps summary={summary.seoOps} />
        </Section>

        <Section id="ops-media" title="Độ phủ hình ảnh" defaultOpen={false}>
          <OperationsMediaCoverage summary={summary.mediaCoverage} />
        </Section>

        <Section id="ops-knowledge" title="Độ phủ Knowledge" defaultOpen={false}>
          <OperationsKnowledgeCoverage summary={summary.knowledgeCoverage} />
        </Section>
      </div>

      <OperationsTopicTimeline topicId={timelineTopicId} onClose={() => setTimelineTopicId(null)} />
    </>
  );
}
