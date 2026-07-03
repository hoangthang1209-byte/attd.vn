"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductionPlanJobRow } from "@/features/production-planning/production-plan.types";

type Props = {
  row: ProductionPlanJobRow;
  onEditPlan: () => void;
};

export default function ProductionPlanRowActions({ row, onEditPlan }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="prod-plan-row-actions" ref={rootRef}>
      <Link href={`/admin/production/jobs/${row.orderItemId}`} className="prod-plan-row-link">
        Mở
      </Link>
      <button
        type="button"
        className="prod-plan-row-actions__toggle"
        aria-label="Thao tác khác"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="prod-plan-row-actions__menu" role="menu">
          {row.canEditPlan && (
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onEditPlan(); }}>
              {row.planId ? "Chỉnh sửa kế hoạch" : "Lập kế hoạch"}
            </button>
          )}
          <Link href={`/admin/orders/${row.orderId}`} role="menuitem" onClick={() => setOpen(false)}>
            Mở đơn hàng
          </Link>
          <Link
            href={`/admin/production/jobs/${row.orderItemId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Xem tài liệu
          </Link>
          <Link
            href={`/admin/production/jobs/${row.orderItemId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Xem QC
          </Link>
        </div>
      )}
    </div>
  );
}
