"use client";

import Link from "next/link";
import type { OrderDetailRecord } from "@/features/orders/order.types";

type Props = {
  order: OrderDetailRecord;
  canEditOrder: boolean;
};

export default function OrderWorkspaceNotesTab({ order, canEditOrder }: Props) {
  return (
    <div className="order-workspace-notes-tab">
      <h3 className="order-workspace-panel-section__title">Ghi chú nội bộ</h3>
      {order.internalNote ? (
        <pre className="order-workspace-note-body">{order.internalNote}</pre>
      ) : (
        <p className="admin-field-hint">Chưa có ghi chú nội bộ.</p>
      )}
      {canEditOrder && (
        <Link href={`/admin/orders/${order.id}/edit`} className="admin-btn admin-btn--secondary admin-btn--small">
          Chỉnh sửa ghi chú
        </Link>
      )}
    </div>
  );
}
