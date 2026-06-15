import type { SeoPlanCalendar, SeoPlanItem } from "@/features/blog/seo-planning-types";

export function generateSeoCalendar(items: SeoPlanItem[]): SeoPlanCalendar {
  const weekMap = new Map<number, SeoPlanItem[]>();

  for (const item of items) {
    const week = item.suggestedPublishWeek;
    const existing = weekMap.get(week) ?? [];
    existing.push(item);
    weekMap.set(week, existing);
  }

  const weeks = [...weekMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, weekItems]) => ({
      week,
      label: `Tuần ${week}`,
      items: weekItems.sort((a, b) => {
        if (a.articleType === "pillar") return -1;
        if (b.articleType === "pillar") return 1;
        return a.priority.localeCompare(b.priority);
      }),
    }));

  return { weeks };
}
