"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { addDays, isSameDay, startOfWeek } from "@/features/content/editorial/editorial-calendar";
import type { OperationsCalendarRangeResult, OperationsCalendarView, OpsTopicCard } from "@/features/content/operations/content-operations.types";

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

/** Range covering exactly what each view renders — the server range query stays tight. */
function computeRange(anchor: Date, view: OperationsCalendarView): { from: Date; to: Date } {
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { from: start, to: addDays(start, 6) };
  }
  if (view === "agenda") {
    return { from: anchor, to: addDays(anchor, 30) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return { from: start, to: addDays(start, 41) };
}

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatDate(d: Date): string {
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}

type OperationsCalendarProps = {
  initialView?: OperationsCalendarView;
};

/**
 * Server-ranged calendar (month/week/agenda) — fetches
 * `GET /api/content/operations/calendar?from=&to=&view=` for exactly the
 * dates it renders. Not limited to the bounded command-center topic list, so
 * publish targets outside the top-N recently-updated topics still show up.
 */
export default function OperationsCalendar({ initialView }: OperationsCalendarProps) {
  const [view, setView] = useState<OperationsCalendarView>(initialView ?? "month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [result, setResult] = useState<OperationsCalendarRangeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = computeRange(anchor, view);
    try {
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), view });
      const res = await fetch(`/api/content/operations/calendar?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { range?: OperationsCalendarRangeResult; message?: string };
      if (!res.ok || !json.range) throw new Error(json.message ?? "Không tải được lịch vận hành");
      setResult(json.range);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch vận hành");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const cells = useMemo(() => (view === "agenda" ? [] : buildGrid(anchor, view, result?.topics ?? [])), [anchor, view, result]);

  const agendaGroups = useMemo(() => {
    if (view !== "agenda" || !result) return [];
    const byDay = new Map<string, { date: Date; cards: OpsTopicCard[] }>();
    for (const card of result.topics) {
      const anchorDate = card.publishedAt ?? card.dueDate;
      if (!anchorDate) continue;
      const d = new Date(anchorDate);
      const key = d.toDateString();
      if (!byDay.has(key)) byDay.set(key, { date: d, cards: [] });
      byDay.get(key)!.cards.push(card);
    }
    return [...byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [view, result]);

  const step = (delta: number) => {
    setAnchor((prev) =>
      view === "week"
        ? addDays(prev, delta * 7)
        : view === "agenda"
          ? addDays(prev, delta * 30)
          : new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  return (
    <section aria-label="Lịch xuất bản vận hành">
      <div className={styles.calendarHeader}>
        <div className="admin-field-hint" style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>
          {view === "week"
            ? `Tuần của ${startOfWeek(anchor).toLocaleDateString("vi-VN")}`
            : view === "agenda"
              ? `${anchor.toLocaleDateString("vi-VN")} — ${addDays(anchor, 30).toLocaleDateString("vi-VN")}`
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
          <button
            type="button"
            className={view === "agenda" ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
            onClick={() => setView("agenda")}
          >
            Lịch trình
          </button>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => step(1)} aria-label="Kỳ sau">
            →
          </button>
        </div>
      </div>

      {result?.truncated ? (
        <p className="admin-field-hint" style={{ color: "#c2410c", marginTop: 0 }}>
          Kết quả vượt quá giới hạn hiển thị — chỉ hiện {result.total} mục đầu tiên trong khoảng ngày này.
        </p>
      ) : null}

      {loading && !result ? (
        <AdminLoadingState label="Đang tải lịch…" rows={3} />
      ) : error ? (
        <EmptyState
          compact
          tone="error"
          title="Không tải được lịch vận hành"
          description={error}
          action={
            <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : view === "agenda" ? (
        agendaGroups.length === 0 ? (
          <EmptyState compact title="Không có mục nào" description="Không có bài đến hạn hoặc xuất bản trong khoảng này." />
        ) : (
          <div className={styles.agendaList}>
            {agendaGroups.map((group) => (
              <div key={group.date.toDateString()}>
                <div className="admin-field-hint" style={{ margin: "0 0 4px", fontWeight: 600, color: "#334155" }}>
                  {formatDate(group.date)}
                </div>
                <div className={styles.kanbanList}>
                  {group.cards.map((card) => (
                    <Link key={card.id} href={card.href} className={styles.card}>
                      <div className={styles.cardTitle}>{card.title}</div>
                      <div className={styles.cardMeta}>
                        <span>{card.owner ?? "Chưa gán"}</span>
                        <span>·</span>
                        <span>{card.campaign}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
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
      )}
    </section>
  );
}
