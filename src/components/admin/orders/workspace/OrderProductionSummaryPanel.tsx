"use client";

import Link from "next/link";
import {
  aggregateProductionSummary,
  type ProductionSummaryCounts,
} from "@/features/orders/order-workspace-status";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";
import type { MaterialAvailabilityRow } from "@/features/materials/material-availability.service";

type Props = {
  orderNo: string;
  bundle: ProductionExecutionBundle | null;
  materialRows: MaterialAvailabilityRow[];
  canViewProduction: boolean;
  roleCode: string | null;
};

function countRow(label: string, value: number, warn = false) {
  return (
    <div className={`order-workspace-prod-summary__row${warn ? " order-workspace-prod-summary__row--warn" : ""}`}>
      <span>{label}</span>
      <span className="order-workspace-prod-summary__count">{value}</span>
    </div>
  );
}

function productionModuleHref(orderNo: string, roleCode: string | null): string {
  const base = `/admin/production?search=${encodeURIComponent(orderNo)}`;
  if (roleCode === "PRODUCTION" || roleCode === "PRODUCTION_MANAGER") return base;
  return base;
}

export default function OrderProductionSummaryPanel({
  orderNo,
  bundle,
  materialRows,
  canViewProduction,
  roleCode,
}: Props) {
  const counts: ProductionSummaryCounts = aggregateProductionSummary(bundle, materialRows);

  if (!canViewProduction) return null;

  return (
    <aside className="order-workspace-prod-summary">
      <h3 className="order-workspace-prod-summary__title">Tóm tắt sản xuất</h3>
      <div className="order-workspace-prod-summary__body">
        {countRow("Tổng số sản phẩm", counts.total)}
        {countRow("Đang chuẩn bị", counts.preparing)}
        {countRow("Đang sản xuất", counts.inProduction)}
        {countRow("Chờ QC", counts.waitingQc)}
        {countRow("Hoàn thành", counts.completed)}
        {countRow("Có vấn đề", counts.hasIssues, counts.hasIssues > 0)}
        {countRow("Thiếu tài liệu", counts.missingDocs, counts.missingDocs > 0)}
        {countRow("Thiếu vật tư", counts.missingMaterials, counts.missingMaterials > 0)}
      </div>
      {roleCode !== "DELIVERY" && (
        <Link href={productionModuleHref(orderNo, roleCode)} className="admin-btn admin-btn--primary admin-btn--small order-workspace-prod-summary__cta">
          Mở quản lý sản xuất
        </Link>
      )}
    </aside>
  );
}
