"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import { formatOrderCurrency, formatOrderDate } from "@/features/orders/order-format";
import {
  ORDER_PAYMENT_STATE_LABELS,
  ORDER_STATUS_LABELS,
  type OrderPaymentStateFilter,
} from "@/features/orders/order-labels";
import type { OrderListRecord } from "@/features/orders/order.types";

export default function OrderListManager() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentState, setPaymentState] = useState<OrderPaymentStateFilter | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (paymentState) params.set("paymentState", paymentState);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json() as {
        orders?: OrderListRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải đơn hàng");
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentState]);

  useEffect(() => { void load(); }, [load]);

  function buildDetailHref(orderId: string) {
    const filter = new URLSearchParams();
    if (search.trim()) filter.set("search", search.trim());
    if (status) filter.set("status", status);
    if (paymentState) filter.set("paymentState", paymentState);
    const qs = filter.toString();
    const params = new URLSearchParams();
    params.set("from", "list");
    if (qs) params.set("qs", qs);
    return `/admin/orders/${orderId}?${params.toString()}`;
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} đơn hàng</p>
      </div>

      <form className="admin-crm-filters" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input
          className="admin-input"
          placeholder="Tìm mã đơn, báo giá, khách hàng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="admin-input"
          value={paymentState}
          onChange={(e) => setPaymentState(e.target.value as OrderPaymentStateFilter | "")}
        >
          <option value="">Tất cả thanh toán</option>
          {(Object.keys(ORDER_PAYMENT_STATE_LABELS) as OrderPaymentStateFilter[]).map((s) => (
            <option key={s} value={s}>{ORDER_PAYMENT_STATE_LABELS[s]}</option>
          ))}
        </select>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>Tìm</button>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading ? <p className="admin-loading">Đang tải...</p> : orders.length === 0 ? (
        <div className="admin-empty-state"><p>Chưa có đơn hàng nào</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Báo giá nguồn</th>
                <th>Khách hàng</th>
                <th>Trạng thái</th>
                <th>Tổng giá trị</th>
                <th>Đã thanh toán</th>
                <th>Còn phải thu</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                  <td><code>{o.orderNo}</code></td>
                  <td>{o.sourceQuoteNo ?? "—"}</td>
                  <td>{o.customerCompanyName ?? o.contactName ?? "—"}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td>{formatOrderCurrency(o.totalAmount)}</td>
                  <td>{formatOrderCurrency(o.paidAmount)}</td>
                  <td>{formatOrderCurrency(o.outstandingAmount)}</td>
                  <td>{formatOrderDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
