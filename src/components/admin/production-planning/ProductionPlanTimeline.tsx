"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatOrderDate } from "@/features/orders/order-format";
import type { ProductionPlanJobRow } from "@/features/production-planning/production-plan.types";

type Props = {
  rows: ProductionPlanJobRow[];
  rangeStart: Date;
  rangeDays: number;
  onJobClick: (row: ProductionPlanJobRow) => void;
};

function dayOffset(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function positionPercent(dateIso: string | null, rangeStart: Date, rangeDays: number): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
  if (diff < 0 || diff > rangeDays) return null;
  return (diff / rangeDays) * 100;
}

export default function ProductionPlanTimeline({ rows, rangeStart, rangeDays, onJobClick }: Props) {
  const days = useMemo(
    () => Array.from({ length: rangeDays + 1 }, (_, i) => dayOffset(rangeStart, i)),
    [rangeStart, rangeDays],
  );

  return (
    <div className="prod-plan-timeline">
      <div className="prod-plan-timeline__header">
        {days.map((d) => (
          <div key={d.toISOString()} className="prod-plan-timeline__day">
            {d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
          </div>
        ))}
      </div>
      <div className="prod-plan-timeline__rows">
        {rows.map((row) => {
          const startPct = positionPercent(row.plannedStartAt, rangeStart, rangeDays);
          const endPct = positionPercent(row.plannedEndAt, rangeStart, rangeDays);
          const deliveryPct = positionPercent(row.deliveryDeadline, rangeStart, rangeDays);
          const internalPct = positionPercent(row.internalDeadline, rangeStart, rangeDays);
          const barLeft = startPct ?? endPct;
          const barRight = endPct ?? startPct;
          const width =
            barLeft != null && barRight != null ? Math.max(barRight - barLeft, 2) : null;

          return (
            <button
              key={row.orderItemId}
              type="button"
              className="prod-plan-timeline__row"
              onClick={() => onJobClick(row)}
            >
              <div className="prod-plan-timeline__row-label">
                <strong>{row.jobCode}</strong>
                <span>{row.productName}</span>
              </div>
              <div className="prod-plan-timeline__track">
                {deliveryPct != null && (
                  <span
                    className="prod-plan-timeline__marker prod-plan-timeline__marker--delivery"
                    style={{ left: `${deliveryPct}%` }}
                    title={`Giao: ${formatOrderDate(row.deliveryDeadline!)}`}
                  />
                )}
                {internalPct != null && (
                  <span
                    className="prod-plan-timeline__marker prod-plan-timeline__marker--internal"
                    style={{ left: `${internalPct}%` }}
                    title={`Hạn SX: ${formatOrderDate(row.internalDeadline!)}`}
                  />
                )}
                {width != null && barLeft != null && (
                  <span
                    className={`prod-plan-timeline__bar prod-plan-timeline__bar--${row.riskTone}`}
                    style={{ left: `${barLeft}%`, width: `${width}%` }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="prod-plan-timeline__legend">
        <span><i className="prod-plan-timeline__marker prod-plan-timeline__marker--delivery" /> Deadline giao</span>
        <span><i className="prod-plan-timeline__marker prod-plan-timeline__marker--internal" /> Hạn SX nội bộ</span>
        <span><i className="prod-plan-timeline__bar prod-plan-timeline__bar--green" /> Kế hoạch</span>
      </div>
    </div>
  );
}
