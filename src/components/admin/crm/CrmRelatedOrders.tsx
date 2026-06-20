"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import { formatOrderCurrency, formatOrderDate } from "@/features/orders/order-format";
import type { OrderListRecord } from "@/features/orders/order.types";

type Props = {
  customerId?: string;
  leadId?: string;
  title?: string;
};

export default function CrmRelatedOrders({ customerId, leadId, title = "Đơn hàng liên quan" }: Props) {
  const [orders, setOrders] = useState<OrderListRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    if (leadId) params.set("leadId", leadId);
    void fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((data: { orders?: OrderListRecord[] }) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, [customerId, leadId]);

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (orders.length === 0) return null;

  return (
    <div className="admin-section-card">
      <div className="admin-section-header">
        <h3>{title}</h3>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Mã đơn</th><th>Báo giá</th><th>Trạng thái</th><th>Tổng</th><th>Ngày tạo</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}>{o.orderNo}</Link></td>
                <td>{o.sourceQuoteNo ?? "—"}</td>
                <td><OrderStatusBadge status={o.status} /></td>
                <td>{formatOrderCurrency(o.totalAmount)}</td>
                <td>{formatOrderDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
