"use client";

import { formatOrderDateTime } from "@/features/orders/order-format";
import type { OrderDetailRecord } from "@/features/orders/order.types";

type Props = {
  order: OrderDetailRecord;
};

export default function OrderWorkspaceActivityTab({ order }: Props) {
  const activities = order.activities ?? [];

  return (
    <div className="order-workspace-activity-tab">
      {activities.length === 0 ? (
        <p className="admin-field-hint">Chưa có hoạt động</p>
      ) : (
        <ul className="order-activity-timeline order-workspace-activity-timeline">
          {activities.map((activity) => (
            <li key={activity.id}>
              <strong>{activity.title}</strong>
              <span className="admin-field-hint"> · {formatOrderDateTime(activity.createdAt)}</span>
              {activity.detail && <p className="admin-field-hint">{activity.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
