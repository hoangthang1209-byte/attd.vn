"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import OrderListQuickStatus from "@/components/admin/orders/OrderListQuickStatus";
import {
  AdminLoadingState,
  AdminPageShell,
  DataToolbar,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
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

  function handleOrderUpdated(orderId: string, updated: OrderListRecord) {
    setOrders((prev) => {
      if (status && updated.status !== status) {
        return prev.filter((o) => o.id !== orderId);
      }
      return prev.map((o) => (o.id === orderId ? updated : o));
    });
    if (status && updated.status !== status) {
      setTotal((t) => Math.max(0, t - 1));
    }
  }

  return (
    <AdminPageShell>
      <PageHeader
        description="Quản lý trạng thái vận hành, thanh toán và tiến độ đơn hàng."
        meta={<span>Tổng: {total} đơn hàng</span>}
        actions={
          <>
            <Link href="/admin/orders/new/quick" className="admin-btn admin-btn--secondary">
              Tạo đơn nhanh
            </Link>
            <Link href="/admin/orders/new" className="admin-btn admin-btn--primary">
              Tạo đơn hàng
            </Link>
          </>
        }
      />

      <form onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <DataToolbar>
          <input
            className="admin-input admin-data-toolbar__search"
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
          <button type="submit" className="admin-btn admin-btn--secondary">Tìm</button>
        </DataToolbar>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading ? <AdminLoadingState label="Đang tải danh sách đơn hàng…" /> : orders.length === 0 ? (
        <EmptyState
          title="Chưa có đơn hàng phù hợp"
          description="Hãy tạo đơn hàng mới hoặc điều chỉnh bộ lọc hiện tại."
          action={
            <>
              <Link href="/admin/orders/new/quick" className="admin-btn admin-btn--secondary">
                Tạo đơn nhanh
              </Link>
              <Link href="/admin/orders/new" className="admin-btn admin-btn--primary">
                Tạo đơn hàng
              </Link>
            </>
          }
        />
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
                <tr key={o.id}>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    <code>{o.orderNo}</code>
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    {o.sourceQuoteNo ?? "—"}
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    {o.customerCompanyName ?? o.contactName ?? "—"}
                  </td>
                  <td className="order-list-status-col" onClick={(e) => e.stopPropagation()}>
                    <OrderListQuickStatus
                      order={o}
                      detailHref={buildDetailHref(o.id)}
                      onUpdated={handleOrderUpdated}
                    />
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    {formatOrderCurrency(o.totalAmount)}
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    {formatOrderCurrency(o.paidAmount)}
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    {formatOrderCurrency(o.outstandingAmount)}
                  </td>
                  <td style={{ cursor: "pointer" }} onClick={() => router.push(buildDetailHref(o.id))}>
                    {formatOrderDate(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
