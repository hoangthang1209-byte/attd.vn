export type ReviewDecisionEntry = {
  decisionType: string;
  actorId?: string;
  createdAt: string;
  note?: string | null;
};

export type ReviewActivityGroup = {
  id: string;
  decisionType: string;
  /** Human summary, e.g. "Đã duyệt 27 đoạn". */
  label: string;
  count: number;
  /** Newest timestamp in the group. */
  at: string;
  items: ReviewDecisionEntry[];
  collapsible: boolean;
};

const SINGULAR_LABELS: Record<string, string> = {
  APPROVE_SECTION: "Đã duyệt đoạn",
  REQUEST_CHANGES: "Yêu cầu chỉnh sửa",
  REJECT_SECTION: "Từ chối đoạn",
  APPROVE_DRAFT: "Phê duyệt bản nháp",
  REJECT_DRAFT: "Từ chối bản nháp",
  REOPEN_DRAFT: "Mở lại kiểm duyệt",
  HANDOFF_TO_BLOG: "Bàn giao sang Blog",
};

const PLURAL_LABELS: Record<string, (count: number) => string> = {
  APPROVE_SECTION: (count) => `Đã duyệt ${count} đoạn`,
  REQUEST_CHANGES: (count) => `Yêu cầu chỉnh sửa ${count} đoạn`,
  REJECT_SECTION: (count) => `Từ chối ${count} đoạn`,
};

export function reviewActivityLabel(decisionType: string, count: number): string {
  if (count > 1) {
    const plural = PLURAL_LABELS[decisionType];
    if (plural) return plural(count);
    return `${SINGULAR_LABELS[decisionType] ?? decisionType} ×${count}`;
  }
  return SINGULAR_LABELS[decisionType] ?? decisionType;
}

/**
 * Collapse a run of identical decisions into one timeline row so that a
 * 27-section approval reads as a single event instead of 27 rows.
 * Entries are returned newest first; order within a group is preserved.
 */
export function groupReviewActivity(decisions: ReviewDecisionEntry[]): ReviewActivityGroup[] {
  const sorted = [...decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groups: ReviewActivityGroup[] = [];
  for (const entry of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.decisionType === entry.decisionType) {
      last.items.push(entry);
      last.count += 1;
      last.label = reviewActivityLabel(last.decisionType, last.count);
      last.collapsible = true;
      continue;
    }
    groups.push({
      id: `${entry.decisionType}-${entry.createdAt}-${groups.length}`,
      decisionType: entry.decisionType,
      label: reviewActivityLabel(entry.decisionType, 1),
      count: 1,
      at: entry.createdAt,
      items: [entry],
      collapsible: false,
    });
  }

  return groups;
}
