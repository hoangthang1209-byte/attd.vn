"use client";

import { Fragment } from "react";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import { formatOrderCurrency } from "@/features/orders/order-format";
import {
  getOrderItemProcessingMethodLabel,
  getOrderItemSupplySourceLabel,
} from "@/features/orders/order-item-classification";
import { getRevenueCategoryDisplay } from "@/features/revenue-categories/revenue-category-display";
import OrderItemSizeMatrix from "@/components/admin/orders/OrderItemSizeMatrix";

type Props = {
  order: OrderDetailRecord;
  canViewFinancials?: boolean;
};

export default function OrderOrderedProductsSection({ order, canViewFinancials = true }: Props) {
  return (
    <fieldset className="admin-catalog-fieldset" id="ordered-products" style={{ marginTop: 16 }}>
      <legend>Sản phẩm đặt hàng</legend>
      <div className="admin-table-wrap">
        <table className="admin-table order-ordered-products-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Sản phẩm lấy từ</th>
              <th>Cách xử lý</th>
              <th>Nhóm doanh thu</th>
              <th>Màu</th>
              <th className="order-item-size-matrix__qty">Tổng SL</th>
              {canViewFinancials && (
                <>
                  <th className="order-item-size-matrix__qty">Đơn giá</th>
                  <th className="order-item-size-matrix__qty">Thành tiền</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <Fragment key={item.id}>
                <tr>
                  <td>
                    {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—"}
                    {item.skuSnapshot && (
                      <div className="admin-field-hint">Mã dòng / SKU: {item.skuSnapshot}</div>
                    )}
                    {item.description && <div className="admin-field-hint">{item.description}</div>}
                    {item.itemNote && <div className="admin-field-hint">Ghi chú: {item.itemNote}</div>}
                  </td>
                  <td>{getOrderItemSupplySourceLabel(item.supplySource)}</td>
                  <td>{getOrderItemProcessingMethodLabel(item.processingMethod)}</td>
                  <td>
                    {getRevenueCategoryDisplay({
                      nameSnapshot: item.revenueCategoryNameSnapshot,
                      codeSnapshot: item.revenueCategoryCodeSnapshot,
                    })}
                  </td>
                  <td>{item.colorSnapshot ?? "—"}</td>
                  <td className="order-item-size-matrix__qty">
                    {item.quantity} {item.unit}
                  </td>
                  {canViewFinancials && (
                    <>
                      <td className="order-item-size-matrix__qty">
                        {formatOrderCurrency(item.unitPrice, order.currency)}
                      </td>
                      <td className="order-item-size-matrix__qty">
                        {formatOrderCurrency(item.lineTotal, order.currency)}
                      </td>
                    </>
                  )}
                </tr>
                {item.variants.length > 0 && (
                  <tr key={`${item.id}-matrix`}>
                    <td colSpan={canViewFinancials ? 8 : 6} className="order-ordered-products-table__matrix-cell">
                      <OrderItemSizeMatrix variants={item.variants} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
