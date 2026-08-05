"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { addDays, isSameDay, startOfWeek } from "@/features/content/editorial/editorial-calendar";
import type { OpsTopicCard } from "@/features/content/operations/content-operations.types";

type CalendarCell = {
  date: Date;
  inMonth: boolean;
  cards: OpsTopicCard[];
};

function buildGrid(anchor: Date, view: "month" | "week", cards: OpsTopicCard[]): CalendarCell[] {
  const cardsByDay = (date: Date) =>
    cards.filter((c) => {
      const anchorDate = c.publishedAt ?? c.dueDate;
      if (!anchorDate) return false;
      return isSameDay(new Date(anchorDate), date);
    });

  if (view === "week") {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, inMonth: true, cards: cardsByDay(date) };
    });
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.getMonth() === anchor.getMonth(), cards: cardsByDay(date) };
  });
}

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type OperationsCalendarProps = {
  topics: OpsTopicCard[];
};

/** Month/week calendar over publish targets — click a card to open its workspace. */
export default function OperationsCalendar({ topics }: OperationsCalendarProps) {
  const [view, setView] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);

  const cells = useMemo(() => buildGrid(anchor, view, topics), [anchor, view, topics]);

  const step = (delta: number) => {
    setAnchor((prev) =>
      view === "week"
        ? addDays(prev, delta * 7)
        : new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  return (
    <section aria-label="Lịch xuất bản vận hành">
      <div className={styles.calendarHeader}>
        <div className="admin-field-hint" style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>
          {view === "week"
            ? `Tuần của ${startOfWeek(anchor).toLocaleDateString("vi-VN")}`
            : anchor.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => step(-1)} aria-label="Kỳ trước">
            ←
          </button>
          <button
            type="button"
            className={view === "month" ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
            onClick={() => setView("month")}
          >
            Tháng
          </button>
          <button
            type="button"
            className={view === "week" ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
            onClick={() => setView("week")}
          >
            Tuần
          </button>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => step(1)} aria-label="Kỳ sau">
            →
          </button>
        </div>
      </div>
      <div className={styles.calendarGrid}>
        {DOW.map((d) => (
          <div key={d} className={styles.calendarDow}>
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const isToday = isSameDay(cell.date, today);
          return (
            <div
              key={cell.date.toISOString()}
              className={`${styles.calendarCell} ${!cell.inMonth ? styles.calendarCellOut : ""} ${isToday ? styles.calendarCellToday : ""}`}
            >
              <div className={styles.calendarDate}>{cell.date.getDate()}</div>
              {cell.cards.slice(0, 3).map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className={styles.calendarPill}
                  style={{
                    background: card.flags.overdue ? "#fff7ed" : card.status === "PUBLISHED" ? "#ecfdf5" : "#eff6ff",
                    color: card.flags.overdue ? "#c2410c" : card.status === "PUBLISHED" ? "#047857" : "#1d4ed8",
                  }}
                  title={card.title}
                >
                  {card.title}
                </Link>
              ))}
              {cell.cards.length > 3 ? <span className={styles.calendarMore}>+{cell.cards.length - 3}</span> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
