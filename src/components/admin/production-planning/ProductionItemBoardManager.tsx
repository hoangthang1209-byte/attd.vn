"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import { formatOrderDate } from "@/features/orders/order-format";
import type { ProductionBoardResponse } from "@/features/production-planning/production-plan.types";
import { PRODUCTION_PLAN_PRIORITY_LABELS } from "@/features/production-planning/production-plan-labels";

export default function ProductionItemBoardManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mine = searchParams.get("mine") === "1";

  const [data, setData] = useState<ProductionBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mine) params.set("mine", "1");
      const res = await fetch(`/api/production/board?${params.toString()}`);
      const body = (await res.json()) as ProductionBoardResponse & { message?: string };
      if (!res.ok) throw new Error(body.message ?? "Không thể tải bảng tiến độ");
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [mine]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="prod-board prod-board-skeleton" aria-busy="true">
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--title" />
        <div className="prod-board__columns" style={{ marginTop: 12 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="prod-board__column prod-board__column--empty">
              <div className="admin-route-loading__skeleton admin-route-loading__skeleton--wide" style={{ height: 120 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error || !data) {
    return <AdminErrorRecovery message={error ?? "Không thể tải bảng tiến độ"} onRetry={() => void load()} />;
  }

  return (
    <div className="prod-board">
      <header className="prod-board__header">
        <div>
          <h1 className="prod-board__title">Bảng tiến độ sản xuất</h1>
          <p className="prod-board__subtitle">Theo dõi trạng thái từng công việc sản xuất</p>
        </div>
        <button
          type="button"
          className={`admin-btn admin-btn--small${mine ? " admin-btn--primary" : " admin-btn--secondary"}`}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (mine) params.delete("mine");
            else params.set("mine", "1");
            router.replace(`/admin/production/board?${params.toString()}`, { scroll: false });
          }}
        >
          Việc của tôi
        </button>
      </header>

      <div className="prod-board__columns">
        {data.columns.map((col) => {
          const isEmpty = col.cards.length === 0;
          return (
            <section
              key={col.key}
              className={`prod-board__column${isEmpty ? " prod-board__column--empty" : ""}`}
            >
              <header className="prod-board__column-header">
                <h2>{col.label}</h2>
                <span>{col.cards.length}</span>
              </header>
              <div className="prod-board__cards">
                {col.cards.map((card) => {
                  const overdue = card.risks.includes("Quá hạn");
                  const deadlineLabel = card.internalDeadline
                    ? formatOrderDate(card.internalDeadline)
                    : "Chưa có hạn SX";

                  return (
                    <Link
                      key={card.orderItemId}
                      href={`/admin/production/jobs/${card.orderItemId}`}
                      className={`prod-board__card prod-board__card--${card.riskTone}${overdue ? " prod-board__card--overdue" : ""}`}
                    >
                      <div className="prod-board__card-product">{card.productName}</div>
                      <div className="prod-board__card-meta-line">
                        <span className="prod-board__card-code">{card.jobCode}</span>
                        <span>{card.orderNo}</span>
                      </div>
                      <div className="prod-board__card-qty">
                        {card.quantity.toLocaleString("vi-VN")} {card.quantityUnit}
                      </div>
                      <div className={`prod-board__card-deadline${overdue ? " is-overdue" : ""}`}>
                        {deadlineLabel}
                      </div>
                      {card.ownerName && (
                        <div className="prod-board__card-owner">{card.ownerName}</div>
                      )}
                      <div className="prod-board__card-badges">
                        {(card.priority === "URGENT" || card.priority === "HIGH") && (
                          <span className={`prod-board__badge prod-board__badge--priority${card.priority === "URGENT" ? " is-urgent" : ""}`}>
                            {PRODUCTION_PLAN_PRIORITY_LABELS[card.priority]}
                          </span>
                        )}
                        {card.risks.slice(0, 2).map((r) => (
                          <span key={r} className="prod-board__badge prod-board__badge--risk">{r}</span>
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
