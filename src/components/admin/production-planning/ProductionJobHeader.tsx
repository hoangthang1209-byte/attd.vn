"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import {
  PRODUCTION_PLAN_PRIORITY_LABELS,
  PRODUCTION_PLAN_STATUS_LABELS,
} from "@/features/production-planning/production-plan-labels";
import { priorityClass, statusClass } from "@/components/admin/production-planning/production-plan-display";
import {
  formatJobDeadlineLine,
  formatJobQuantity,
  splitHeaderRisks,
} from "@/components/admin/production-planning/production-job-workspace";

type Props = {
  plan: ProductionPlanDetail;
  canManagePlan: boolean;
  onEditPlan: () => void;
  onAssign: () => void;
};

export default function ProductionJobHeader({
  plan,
  canManagePlan,
  onEditPlan,
  onAssign,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const riskRef = useRef<HTMLDivElement>(null);
  const { visible, overflow } = splitHeaderRisks(plan.risks);

  useEffect(() => {
    if (!menuOpen && !riskOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuOpen && !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
      if (riskOpen && !riskRef.current?.contains(e.target as Node)) setRiskOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setRiskOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, riskOpen]);

  return (
    <>
      <nav className="prod-job__breadcrumb" aria-label="Đường dẫn">
        <Link href="/admin/production">Sản xuất</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/admin/production/plan">Công việc sản xuất</Link>
        <span aria-hidden="true"> / </span>
        <span>{plan.jobCode}</span>
      </nav>

      <header className="prod-job__header prod-job-header">
        <div className="prod-job-header__main">
          <h1 className="prod-job-header__product">{plan.productName}</h1>
          <div className="prod-job-header__identity">
            <span className="prod-job-header__code">{plan.jobCode}</span>
            <span className={statusClass(plan.status)}>
              {PRODUCTION_PLAN_STATUS_LABELS[plan.status]}
            </span>
          </div>
          <p className="prod-job-header__secondary">
            <span>{plan.orderNo} · {formatJobQuantity(plan)}</span>
            <span className="prod-job-header__sep">·</span>
            <span>{formatJobDeadlineLine(plan)}</span>
            <span className="prod-job-header__sep">·</span>
            <span>Phụ trách: {plan.ownerName ?? "Chưa phân công"}</span>
          </p>
          <div className="prod-job-header__meta">
            {plan.workshopName && <span>Xưởng: {plan.workshopName}</span>}
            <span className={`prod-plan-priority ${priorityClass(plan.priority)}`}>
              {PRODUCTION_PLAN_PRIORITY_LABELS[plan.priority]}
            </span>
          </div>
        </div>

        <div className="prod-job-header__aside">
          <div className="prod-job-header__risks">
            {visible.map((r) => (
              <span key={r} className={`prod-plan-risk prod-plan-risk--${plan.riskTone}`}>
                {r}
              </span>
            ))}
            {overflow.length > 0 && (
              <div className="prod-job-header__risk-overflow" ref={riskRef}>
                <button
                  type="button"
                  className="prod-job-header__risk-more"
                  aria-expanded={riskOpen}
                  onClick={() => setRiskOpen((v) => !v)}
                >
                  +{overflow.length}
                </button>
                {riskOpen && (
                  <div className="prod-job-header__risk-popover" role="tooltip">
                    {overflow.map((r) => (
                      <span key={r} className={`prod-plan-risk prod-plan-risk--${plan.riskTone}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {canManagePlan && (
            <div className="prod-job-header__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={onEditPlan}
              >
                {plan.planId ? "Chỉnh sửa kế hoạch" : "Lập kế hoạch"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={onAssign}
              >
                Phân công
              </button>
              <div className="prod-job-header__menu" ref={menuRef}>
                <button
                  type="button"
                  className="prod-plan-row-actions__toggle"
                  aria-label="Thao tác"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  Thao tác
                </button>
                {menuOpen && (
                  <div className="prod-plan-row-actions__menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEditPlan(); }}>
                      {plan.planId ? "Chỉnh sửa kế hoạch" : "Lập kế hoạch"}
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onAssign(); }}>
                      Phân công phụ trách
                    </button>
                    <Link
                      href={`/admin/production/board`}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Mở bảng sản xuất
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
