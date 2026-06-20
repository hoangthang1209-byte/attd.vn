import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";

type Props = { status: OrderStatus };

export default function OrderStatusBadge({ status }: Props) {
  return <span className={`order-status-badge order-status-badge--${status.toLowerCase()}`}>{ORDER_STATUS_LABELS[status]}</span>;
}
