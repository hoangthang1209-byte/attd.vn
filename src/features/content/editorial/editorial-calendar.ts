import type { SeoTopicPriority, SeoTopicStatus } from "@prisma/client";
import {
  CONTENT_STATUS_COLORS,
  getTopicProgressPercent,
  topicWorkspaceHref,
} from "@/features/content/editorial/editorial-ux";

export type CalendarViewMode = "pipeline" | "month" | "week" | "agenda";

export const CALENDAR_PIPELINE_COLUMNS = [
  { key: "ideas", label: "Ideas" },
  { key: "brief", label: "Brief" },
  { key: "writing", label: "Writing" },
  { key: "review", label: "Review" },
  { key: "ready", label: "Ready" },
  { key: "published", label: "Published" },
] as const;

export type CalendarPipelineColumn = (typeof CALENDAR_PIPELINE_COLUMNS)[number]["key"];

export type EditorialCalendarTopic = {
  id: string;
  title: string;
  primaryKeyword: string;
  status: SeoTopicStatus;
  priority: SeoTopicPriority;
  assignedTo: string | null;
  dueDate: string | null;
  publishedAt: string | null;
  targetUrl: string | null;
  wordCountMax: number | null;
  clusterId: string;
  clusterName: string;
  strategyId: string;
  strategyName: string;
};

export type EditorialCalendarCampaign = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  topicCount: number;
  publishedCount: number;
};

/** Planning-only stage for pipeline board (no workflow changes). */
export function getCalendarPipelineColumn(
  topic: Pick<EditorialCalendarTopic, "status" | "targetUrl">,
): CalendarPipelineColumn {
  if (topic.status === "PUBLISHED") return "published";
  if (topic.status === "REVIEW") {
    return topic.targetUrl ? "ready" : "review";
  }
  if (topic.status === "DRAFTING") {
    return topic.targetUrl ? "ready" : "writing";
  }
  if (topic.status === "APPROVED" || topic.status === "BRIEF_READY") return "brief";
  if (topic.status === "IDEA" || topic.status === "RESEARCHING") return "ideas";
  return "ideas";
}

export type DeadlineTone = "late" | "today" | "completed" | "upcoming" | "none";

export function getDeadlineTone(
  dueDate: string | null,
  status: SeoTopicStatus,
  now = new Date(),
): DeadlineTone {
  if (status === "PUBLISHED" || status === "ARCHIVED") return "completed";
  if (!dueDate) return "none";
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(now);
  if (due.getTime() < today.getTime()) return "late";
  if (due.getTime() === today.getTime()) return "today";
  return "upcoming";
}

export function deadlineToneColors(tone: DeadlineTone) {
  if (tone === "late") return CONTENT_STATUS_COLORS.needsReview; // orange
  if (tone === "today") return CONTENT_STATUS_COLORS.draft; // blue
  if (tone === "completed") return CONTENT_STATUS_COLORS.published; // green
  return CONTENT_STATUS_COLORS.waiting;
}

export function estimateReadingMinutes(wordCountMax: number | null): number | null {
  if (!wordCountMax || wordCountMax <= 0) return null;
  return Math.max(1, Math.round(wordCountMax / 200));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  return startOfDay(addDays(d, diff));
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const t = startOfDay(date).getTime();
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
}

export type AgendaGroupKey = "today" | "tomorrow" | "this_week" | "next_week" | "later" | "undated";

export const AGENDA_GROUP_LABELS: Record<AgendaGroupKey, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This Week",
  next_week: "Next Week",
  later: "Later",
  undated: "Chưa có hạn",
};

export function getAgendaGroup(dueDate: string | null, now = new Date()): AgendaGroupKey {
  if (!dueDate) return "undated";
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekEnd = endOfWeek(today);
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  if (due.getTime() <= today.getTime()) return "today"; // overdue + today in Today for planning urgency
  if (isSameDay(due, tomorrow)) return "tomorrow";
  if (isWithinRange(due, today, weekEnd)) return "this_week";
  if (isWithinRange(due, nextWeekStart, nextWeekEnd)) return "next_week";
  return "later";
}

export function groupTopicsByPipeline(
  topics: EditorialCalendarTopic[],
): Record<CalendarPipelineColumn, EditorialCalendarTopic[]> {
  const groups: Record<CalendarPipelineColumn, EditorialCalendarTopic[]> = {
    ideas: [],
    brief: [],
    writing: [],
    review: [],
    ready: [],
    published: [],
  };
  for (const topic of topics) {
    if (topic.status === "ARCHIVED" || topic.status === "REJECTED") continue;
    groups[getCalendarPipelineColumn(topic)].push(topic);
  }
  return groups;
}

export function groupTopicsByAgenda(
  topics: EditorialCalendarTopic[],
  now = new Date(),
): Record<AgendaGroupKey, EditorialCalendarTopic[]> {
  const groups: Record<AgendaGroupKey, EditorialCalendarTopic[]> = {
    today: [],
    tomorrow: [],
    this_week: [],
    next_week: [],
    later: [],
    undated: [],
  };
  for (const topic of topics) {
    if (topic.status === "ARCHIVED") continue;
    groups[getAgendaGroup(topic.dueDate, now)].push(topic);
  }
  for (const key of Object.keys(groups) as AgendaGroupKey[]) {
    groups[key].sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }
  return groups;
}

export type MonthCell = {
  date: Date;
  inMonth: boolean;
  topics: EditorialCalendarTopic[];
};

export function buildMonthGrid(
  year: number,
  monthIndex: number,
  topics: EditorialCalendarTopic[],
): MonthCell[] {
  const first = new Date(year, monthIndex, 1);
  const start = startOfWeek(first);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const dayTopics = topics.filter((t) => {
      const anchor = t.publishedAt ?? t.dueDate;
      if (!anchor) return false;
      return isSameDay(new Date(anchor), date);
    });
    cells.push({
      date,
      inMonth: date.getMonth() === monthIndex,
      topics: dayTopics,
    });
  }
  return cells;
}

export function buildWeekDays(anchor: Date, topics: EditorialCalendarTopic[]): MonthCell[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const dayTopics = topics.filter((t) => {
      const anchorDate = t.publishedAt ?? t.dueDate;
      if (!anchorDate) return false;
      return isSameDay(new Date(anchorDate), date);
    });
    return { date, inMonth: true, topics: dayTopics };
  });
}

export type PublishingCapacity = {
  planned: number;
  published: number;
  overdue: number;
  blocked: number;
  ready: number;
};

export function computeWeekCapacity(
  topics: EditorialCalendarTopic[],
  now = new Date(),
): PublishingCapacity {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const today = startOfDay(now);
  let planned = 0;
  let published = 0;
  let overdue = 0;
  let blocked = 0;
  let ready = 0;

  for (const topic of topics) {
    if (topic.status === "ARCHIVED") continue;
    const stage = getCalendarPipelineColumn(topic);
    if (stage === "ready") ready += 1;
    if (topic.status === "PAUSED" || topic.status === "REJECTED") blocked += 1;

    if (topic.publishedAt && isWithinRange(new Date(topic.publishedAt), weekStart, weekEnd)) {
      published += 1;
    }
    if (topic.dueDate && isWithinRange(new Date(topic.dueDate), weekStart, weekEnd)) {
      planned += 1;
    }
    if (
      topic.dueDate &&
      startOfDay(new Date(topic.dueDate)).getTime() < today.getTime() &&
      topic.status !== "PUBLISHED"
    ) {
      overdue += 1;
    }
  }

  return { planned, published, overdue, blocked, ready };
}

export function campaignProgress(campaign: EditorialCalendarCampaign): number {
  if (campaign.topicCount <= 0) return 0;
  return Math.round((campaign.publishedCount / campaign.topicCount) * 100);
}

export function filterCalendarTopics(
  topics: EditorialCalendarTopic[],
  filters: {
    strategyId?: string;
    clusterId?: string;
    owner?: string;
    status?: string;
    priority?: string;
    month?: string; // YYYY-MM
  },
): EditorialCalendarTopic[] {
  return topics.filter((topic) => {
    if (filters.strategyId && topic.strategyId !== filters.strategyId) return false;
    if (filters.clusterId && topic.clusterId !== filters.clusterId) return false;
    if (filters.owner && (topic.assignedTo ?? "") !== filters.owner) return false;
    if (filters.status && topic.status !== filters.status) return false;
    if (filters.priority && topic.priority !== filters.priority) return false;
    if (filters.month) {
      const [y, m] = filters.month.split("-").map(Number);
      if (!y || !m) return false;
      const anchor = topic.dueDate ?? topic.publishedAt;
      if (!anchor) return false;
      const d = new Date(anchor);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
    }
    return true;
  });
}

export function toCalendarCardModel(topic: EditorialCalendarTopic) {
  const progress = getTopicProgressPercent(topic.status);
  const stage = getCalendarPipelineColumn(topic);
  const reading = estimateReadingMinutes(topic.wordCountMax);
  return {
    ...topic,
    progress,
    stage,
    readingMinutes: reading,
    workspaceHref: topicWorkspaceHref(topic.id),
    deadlineTone: getDeadlineTone(topic.dueDate, topic.status),
  };
}
