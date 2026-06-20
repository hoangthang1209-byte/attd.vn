import type {
  OrderActivityType,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderPaymentType,
  OrderStatus,
  QuotePriceVatType,
} from "@prisma/client";
import type { OrderPaymentStateFilter } from "@/features/orders/order-labels";

export type OrderFinancialSummary = {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overpaidAmount: number;
  paymentState: OrderPaymentStateFilter;
};

export type OrderListRecord = {
  id: string;
  orderNo: string;
  sourceQuoteNo: string | null;
  customerCompanyName: string | null;
  contactName: string | null;
  status: OrderStatus;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overpaidAmount: number;
  paymentState: OrderPaymentStateFilter;
  createdAt: string;
};

export type OrderItemRecord = {
  id: string;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  description: string | null;
  designImageUrl: string | null;
  skuSnapshot: string | null;
  colorSnapshot: string | null;
  categorySnapshot: string | null;
  genderSnapshot: string | null;
  moqSnapshot: number | null;
  itemNote: string | null;
  productionLeadTime: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

export type OrderPaymentRecord = {
  id: string;
  type: OrderPaymentType;
  method: OrderPaymentMethod;
  status: OrderPaymentStatus;
  amount: number;
  paidAt: string;
  referenceCode: string | null;
  note: string | null;
  voidReason: string | null;
  createdAt: string;
};

export type OrderActivityRecord = {
  id: string;
  type: OrderActivityType;
  title: string;
  detail: string | null;
  createdAt: string;
};

export type OrderDetailRecord = {
  id: string;
  orderNo: string;
  quoteId: string | null;
  customerId: string | null;
  contactId: string | null;
  status: OrderStatus;
  currency: string;
  priceVatType: QuotePriceVatType;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  orderDate: string;
  confirmedAt: string | null;
  productionStartedAt: string | null;
  readyToShipAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  customerNote: string | null;
  internalNote: string | null;
  terms: string | null;
  sampleFee: number | null;
  sampleLeadTime: string | null;
  sampleRefundCondition: string | null;
  customerCompanyName: string | null;
  customerCode: string | null;
  customerTaxCode: string | null;
  customerAddress: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  salesName: string | null;
  salesTitle: string | null;
  salesPhone: string | null;
  salesEmail: string | null;
  sourceQuoteNo: string | null;
  sourceQuoteDate: string | null;
  sourceQuoteValidUntil: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; code: string } | null;
  quote: { id: string; quoteNo: string } | null;
  items: OrderItemRecord[];
  payments: OrderPaymentRecord[];
  activities: OrderActivityRecord[];
  financials: OrderFinancialSummary;
};

export type RecordOrderPaymentInput = {
  type: OrderPaymentType;
  method: OrderPaymentMethod;
  amount: number;
  paidAt: string;
  referenceCode?: string | null;
  note?: string | null;
};

export type UpdateOrderStatusInput = {
  status: OrderStatus;
  cancelReason?: string | null;
};
