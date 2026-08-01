"use client";

import { useState } from "react";
import {
  groupReviewActivity,
  type ReviewDecisionEntry,
} from "@/features/content/editorial/review-activity";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function ActivityGroupRow({
  label,
  at,
  items,
  collapsible,
}: {
  label: string;
  at: string;
  items: ReviewDecisionEntry[];
  collapsible: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!collapsible) {
    const note = items[0]?.note;
    return (
      <div className="review-activity-group">
        <div className="review-activity-group__summary">
          <span className="review-activity-group__title">
            {label}
            {note ? ` — ${note}` : ""}
          </span>
          <span className="review-activity-group__meta">{formatTime(at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="review-activity-group">
      <button
        type="button"
        className="review-activity-group__summary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="review-activity-group__title">{label}</span>
        <span className="review-activity-group__meta">
          {formatTime(at)} · {open ? "Thu gọn" : "Expand"}
        </span>
      </button>
      {open && (
        <ul className="review-activity-group__items">
          {items.map((item, index) => (
            <li key={`${item.createdAt}-${index}`}>
              {formatTime(item.createdAt)}
              {item.note ? ` — ${item.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReviewActivityTimeline({
  decisions,
}: {
  decisions: ReviewDecisionEntry[];
}) {
  const groups = groupReviewActivity(decisions);

  if (groups.length === 0) {
    return <p className="admin-field-hint">Chưa có hoạt động kiểm duyệt.</p>;
  }

  return (
    <div className="review-activity-timeline">
      {groups.map((group) => (
        <ActivityGroupRow
          key={group.id}
          label={group.label}
          at={group.at}
          items={group.items}
          collapsible={group.collapsible}
        />
      ))}
    </div>
  );
}
