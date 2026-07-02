"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import {
  getOrderItemProcessingMethodLabel,
  getOrderItemSupplySourceLabel,
} from "@/features/orders/order-item-classification";
import type { OrderDetailRecord, OrderItemRecord } from "@/features/orders/order.types";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";
import type { MaterialAvailabilityRow } from "@/features/materials/material-availability.service";
import {
  deriveDocumentStatus,
  deriveMaterialStatus,
  deriveProgressPercent,
  deriveQcStatus,
  findExecutionBundleForItem,
  mapReadinessToProgressBadge,
  PRODUCT_PROGRESS_LABELS,
  type ProductProgressBadge,
} from "@/features/orders/order-workspace-status";

type ItemMaterialRow = {
  orderItemId: string;
  materials: Array<{ id: string; materialType: string }>;
};

type Props = {
  order: OrderDetailRecord;
  bundle: ProductionExecutionBundle | null;
  itemMaterials: ItemMaterialRow[];
  materialRows: MaterialAvailabilityRow[];
  loading: boolean;
  canViewProduction: boolean;
  canEditOrder: boolean;
};

function compactSizeSummary(item: OrderItemRecord): string {
  if (item.variants.length === 0) return "—";
  const sizes = [...new Set(item.variants.map((v) => v.sizeValue).filter(Boolean))];
  if (sizes.length <= 4) return sizes.join(", ");
  return `${sizes.slice(0, 3).join(", ")} +${sizes.length - 3}`;
}

function progressTone(badge: ProductProgressBadge): string {
  switch (badge) {
    case "COMPLETED":
      return "ok";
    case "IN_PRODUCTION":
    case "WAITING_QC":
      return "active";
    case "OVERDUE":
      return "danger";
    case "WAITING_DOCS":
      return "warn";
    default:
      return "muted";
  }
}

function productionItemHref(orderNo: string, orderItemId: string) {
  return `/admin/production?search=${encodeURIComponent(orderNo)}&highlightItem=${orderItemId}`;
}

export default function OrderProductTable({
  order,
  bundle,
  itemMaterials,
  materialRows,
  loading,
  canViewProduction,
  canEditOrder,
}: Props) {
  const [expandedSizes, setExpandedSizes] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (loading) {
    return <AdminInlineLoader message="Đang tải sản phẩm…" />;
  }

  return (
    <div className="order-workspace-product-table-wrap">
      <div className="admin-table-wrap order-workspace-product-table-scroll">
        <table className="admin-table order-workspace-product-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Sản phẩm</th>
              <th>Màu / quy cách</th>
              <th>Size</th>
              <th>Số lượng</th>
              <th>Tiến độ</th>
              <th>Tài liệu</th>
              <th>Vật tư</th>
              <th>QC</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const exec = findExecutionBundleForItem(bundle, item.id);
              const progressBadge = exec
                ? mapReadinessToProgressBadge(exec.readiness.state)
                : "PREPARING";
              const progressPct = exec ? deriveProgressPercent(exec) : null;
              const docStatus = exec ? deriveDocumentStatus(exec) : "Thiếu";
              const matStatus = deriveMaterialStatus(item.id, itemMaterials, materialRows);
              const qcStatus = exec ? deriveQcStatus(exec.qc) : "Chờ QC";
              const sizeExpanded = expandedSizes[item.id];

              return (
                <Fragment key={item.id}>
                  <tr>
                    <td>{index + 1}</td>
                    <td>
                      <div className="order-workspace-product-cell">
                        {item.designImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.designImageUrl} alt="" className="order-workspace-product-thumb" />
                        )}
                        <div>
                          <div className="order-workspace-product-name">
                            {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—"}
                          </div>
                          <div className="order-workspace-product-sub">
                            {getOrderItemProcessingMethodLabel(item.processingMethod)}
                            {" · "}
                            {getOrderItemSupplySourceLabel(item.supplySource)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{item.colorSnapshot ?? "—"}</div>
                      {item.categorySnapshot && (
                        <div className="order-workspace-product-sub">{item.categorySnapshot}</div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="order-workspace-size-toggle"
                        onClick={() =>
                          setExpandedSizes((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                      >
                        {compactSizeSummary(item)}
                      </button>
                    </td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>
                      <span className={`order-workspace-badge order-workspace-badge--${progressTone(progressBadge)}`}>
                        {PRODUCT_PROGRESS_LABELS[progressBadge]}
                      </span>
                      {progressPct != null && (
                        <div className="order-workspace-progress">
                          <div className="order-workspace-progress__bar" style={{ width: `${progressPct}%` }} />
                          <span className="order-workspace-progress__label">{progressPct}%</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`order-workspace-status-pill order-workspace-status-pill--${docStatus === "Đủ" ? "ok" : "warn"}`}>
                        {docStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`order-workspace-status-pill order-workspace-status-pill--${matStatus === "Đủ" ? "ok" : "warn"}`}>
                        {matStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`order-workspace-status-pill order-workspace-status-pill--${qcStatus === "Đạt" ? "ok" : qcStatus === "Cần làm lại" ? "danger" : "active"}`}>
                        {qcStatus}
                      </span>
                    </td>
                    <td>
                      <div className="order-workspace-row-actions">
                        {canViewProduction && (
                          <Link
                            href={productionItemHref(order.orderNo, item.id)}
                            className="admin-btn admin-btn--primary admin-btn--xs"
                          >
                            Mở sản xuất
                          </Link>
                        )}
                        <div className="order-workspace-row-menu">
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            onClick={() => setOpenMenuId((id) => (id === item.id ? null : item.id))}
                          >
                            ⋯
                          </button>
                          {openMenuId === item.id && (
                            <div className="order-workspace-row-menu__panel">
                              {canViewProduction && (
                                <Link href={productionItemHref(order.orderNo, item.id)}>Mở sản xuất</Link>
                              )}
                              <Link href={`/admin/production?search=${encodeURIComponent(order.orderNo)}#files`}>
                                Xem tài liệu
                              </Link>
                              {canViewProduction && (
                                <Link href={productionItemHref(order.orderNo, item.id)}>Xem QC</Link>
                              )}
                              {canEditOrder && (
                                <Link href={`/admin/orders/${order.id}/edit`}>Chỉnh sửa dòng hàng</Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {sizeExpanded && item.variants.length > 0 && (
                    <tr className="order-workspace-product-table__expand">
                      <td colSpan={10}>
                        <div className="order-workspace-size-matrix">
                          {item.variants.map((v) => (
                            <span key={v.id} className="order-workspace-size-chip">
                              {v.sizeValue ?? "—"}: {v.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
