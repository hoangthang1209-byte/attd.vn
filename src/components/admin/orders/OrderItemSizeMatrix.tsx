"use client";

import type { OrderItemRecord } from "@/features/orders/order.types";
import {
  buildOrderItemSizeMatrix,
  matrixQuantityDisplay,
} from "@/features/orders/order-item-size-matrix";

type Props = {
  variants: OrderItemRecord["variants"];
};

export default function OrderItemSizeMatrix({ variants }: Props) {
  const matrix = buildOrderItemSizeMatrix(variants);
  if (!matrix || matrix.columns.length === 0) return null;

  return (
    <div className="order-item-size-matrix-wrap">
      <table className="admin-table admin-table--compact order-item-size-matrix">
        <thead>
          <tr>
            <th>Màu</th>
            {matrix.columns.map((col) => (
              <th key={col.key} className="order-item-size-matrix__qty">
                {col.label}
              </th>
            ))}
            <th className="order-item-size-matrix__qty">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.colorLabel}>
              <td className="order-item-size-matrix__color">{row.colorLabel}</td>
              {matrix.columns.map((col) => (
                <td key={col.key} className="order-item-size-matrix__qty">
                  {matrixQuantityDisplay(row.quantities, col.key)}
                </td>
              ))}
              <td className="order-item-size-matrix__qty">
                <strong>{row.total}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
