import type { OrderPaymentType, OrderPaymentStatus } from "@prisma/client";
import type { OrderPaymentStateFilter } from "@/features/orders/order-labels";

type PaymentLike = {
  type: OrderPaymentType;
  status: OrderPaymentStatus;
  amount: number;
};

export function computeOrderFinancials(
  totalAmount: number,
  payments: PaymentLike[],
): {
  paidAmount: number;
  outstandingAmount: number;
  overpaidAmount: number;
  paymentState: OrderPaymentStateFilter;
} {
  let paidAmount = 0;
  for (const payment of payments) {
    if (payment.status !== "CONFIRMED") continue;
    if (payment.type === "REFUND") {
      paidAmount -= payment.amount;
    } else {
      paidAmount += payment.amount;
    }
  }

  const outstandingAmount = Math.max(totalAmount - paidAmount, 0);
  const overpaidAmount = Math.max(paidAmount - totalAmount, 0);

  let paymentState: OrderPaymentStateFilter = "UNPAID";
  if (overpaidAmount > 0) paymentState = "OVERPAID";
  else if (paidAmount <= 0) paymentState = "UNPAID";
  else if (outstandingAmount > 0) paymentState = "PARTIAL";
  else paymentState = "PAID";

  return { paidAmount, outstandingAmount, overpaidAmount, paymentState };
}

export function computeConfirmedNetPaid(payments: PaymentLike[]): number {
  let paidAmount = 0;
  for (const payment of payments) {
    if (payment.status !== "CONFIRMED") continue;
    if (payment.type === "REFUND") paidAmount -= payment.amount;
    else paidAmount += payment.amount;
  }
  return paidAmount;
}
