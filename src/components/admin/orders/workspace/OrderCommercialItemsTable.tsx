"use client";

import { formatOrderCurrency } from "@/features/orders/order-format";
import { formatPricingPercent } from "@/features/pricing/format";
import type { OrderItemRecord } from "@/features/orders/order.types";

type Props = {
  items: OrderItemRecord[];
  currency: string;
};

export default function OrderCommercialItemsTable({ items, currency }: Props) {
  const hasQuotedCost = items.some((item) => item.quotedUnitCost != null || item.quotedTotalCost != null);
  if (!hasQuotedCost) {
    return (
      <p className="admin-field-hint">
        Chưa có giá vốn báo giá trên đơn hàng. Giá vốn được chụp khi chuyển từ báo giá có costing.
      </p>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Đơn giá bán</th>
            <th>Giá vốn báo giá / SP</th>
            <th>Biên LN báo giá</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—"}
              </td>
              <td>{formatOrderCurrency(item.unitPrice, currency)}</td>
              <td>{formatOrderCurrency(item.quotedUnitCost, currency)}</td>
              <td>
                {item.quotedMarginRate != null ? formatPricingPercent(item.quotedMarginRate) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
