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
import {
  filterOperationsTopics,
  searchOperationsTopics,
} from "@/features/content/operations/content-operations.mapping";
import {
  OPERATIONS_PIPELINE_COLUMNS,
  type ContentOperationsCommandCenter,
  type OperationsFilters,
  type OperationsPipelineColumnKey,
  type OpsTopicCard,
} from "@/features/content/operations/content-operations.types";

type MainView = "kanban" | "calendar";

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

/**
 * Read-only operational cockpit — no workflow mutations. Single fetch of the
 * bounded summary payload; all filtering/search/kanban grouping below is
 * client-side over the already-fetched `topics` array.
 */
export default function ContentOperationsClient() {
  const toast = useAdminToast();
  const [summary, setSummary] = useState<ContentOperationsCommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OperationsFilters>({});
  const [search, setSearch] = useState("");
  const [mainView, setMainView] = useState<MainView>("kanban");

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

  const handleHealthSelect = (hrefFilter: string) => {
    const key = hrefFilter as keyof OperationsFilters;
    setFilters((prev) => ({ ...prev, [key]: prev[key] ? undefined : true }) as OperationsFilters);
  };

  const handlePipelineSelect = (column: OperationsPipelineColumnKey | undefined) => {
    setFilters((prev) => ({ ...prev, pipelineColumn: column }));
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

        <OperationsFilterBar filters={filters} onChange={setFilters} filtersMeta={summary.filtersMeta} />

        <OperationsPipeline
          entries={pipelineSummary}
          activeColumn={filters.pipelineColumn}
          onSelect={handlePipelineSelect}
        />

        <div className={styles.mainGrid}>
          <div>
            <div className={styles.mainTabs}>
              <button
                type="button"
                className={mainView === "kanban" ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
                onClick={() => setMainView("kanban")}
              >
                Kanban
              </button>
              <button
                type="button"
                className={mainView === "calendar" ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
                onClick={() => setMainView("calendar")}
              >
                Lịch
              </button>
            </div>
            {mainView === "kanban" ? <OperationsKanban kanban={kanban} /> : <OperationsCalendar topics={filtered} />}
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

        <Section id="ops-campaigns" title="Theo chiến dịch">
          <OperationsCampaigns campaigns={summary.campaigns} />
        </Section>

        <Section id="ops-clusters" title="Cụm chủ đề" defaultOpen={false}>
          <OperationsClusters clusters={summary.clusters} />
        </Section>

        <Section id="ops-review" title="Kiểm duyệt" defaultOpen={false}>
          <OperationsReviewQueue summary={summary.reviewQueue} />
        </Section>

        <Section id="ops-publish" title="Xuất bản" defaultOpen={false}>
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
    </>
  );
}
