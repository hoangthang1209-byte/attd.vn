import type {
  OrderActivityType,
  OrderItemProcessingMethod,
  OrderItemSupplySource,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderPaymentType,
  OrderProductGender,
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

export type OrderItemVariantRecord = {
  id: string;
  colorId: string | null;
  colorNameSnapshot: string | null;
  sizeValue: string | null;
  skuSnapshot: string | null;
  quantity: number;
  unit: string;
  sortOrder: number;
};

export type OrderItemRecord = {
  id: string;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  description: string | null;
  designImageUrl: string | null;
  skuSnapshot: string | null;
  colorId: string | null;
  categoryId: string | null;
  gender: OrderProductGender | null;
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
  supplySource: OrderItemSupplySource | null;
  processingMethod: OrderItemProcessingMethod | null;
  revenueCategoryId: string | null;
  revenueCategoryNameSnapshot: string | null;
  revenueCategoryCodeSnapshot: string | null;
  variants: OrderItemVariantRecord[];
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
  editReason: string | null;
  editedAt: string | null;
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
  salesRepresentativeId: string | null;
  salesEmployeeId: string | null;
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
  productionDueDate: string | null;
  productionOwnerId: string | null;
  productionOwnerName: string | null;
  productionNote: string | null;
  deliveryMethodId: string | null;
  deliveryMethodName: string | null;
  deliveryMethod: string | null;
  deliveryOwnerId: string | null;
  deliveryOwnerName: string | null;
  deliveryRecipientName: string | null;
  deliveryRecipientPhone: string | null;
  deliveryAddress: string | null;
  deliveryTrackingCode: string | null;
  deliveryCarrier: string | null;
  deliveryCarrierId: string | null;
  deliveryCarrierName: string | null;
  deliveryNote: string | null;
  deliveryExpectedAt: string | null;
  deliveredAt: string | null;
  deliveryMethodRequiresCarrier: boolean;
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
  correctionReason?: string | null;
  productionReadinessAcknowledged?: boolean;
  handoverReadinessAcknowledged?: boolean;
  handoverOverrideReason?: string | null;
  partialDeliveryAcknowledged?: boolean;
  shippedExecutionAcknowledged?: boolean;
  shippedOverrideReason?: string | null;
  completionReadinessAcknowledged?: boolean;
  completionOverrideReason?: string | null;
};

export type OrderItemVariantInputPayload = {
  id?: string | null;
  colorId?: string | null;
  colorNameSnapshot?: string | null;
  sizeValue?: string | null;
  skuSnapshot?: string | null;
  quantity: number;
  unit?: string | null;
  sortOrder?: number;
};

export type OrderItemInputPayload = {
  id?: string | null;
  productId?: string | null;
  variantId?: string | null;
  productNameSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  description?: string | null;
  designMediaAssetId?: string | null;
  designImageUrl?: string | null;
  skuSnapshot?: string | null;
  colorId?: string | null;
  categoryId?: string | null;
  gender?: OrderProductGender | null;
  colorSnapshot?: string | null;
  categorySnapshot?: string | null;
  genderSnapshot?: string | null;
  moqSnapshot?: number | null;
  itemNote?: string | null;
  productionLeadTime?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  sortOrder?: number;
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
  revenueCategoryId?: string | null;
  variants?: OrderItemVariantInputPayload[];
};

export type CreateManualOrderInput = {
  customerId?: string | null;
  contactId?: string | null;
  salesRepresentativeId?: string | null;
  salesEmployeeId?: string | null;
  orderDate: string;
  currency?: string;
  priceVatType?: QuotePriceVatType;
  customerCompanyName?: string | null;
  customerCode?: string | null;
  customerTaxCode?: string | null;
  customerAddress?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  salesName?: string | null;
  salesTitle?: string | null;
  salesPhone?: string | null;
  salesEmail?: string | null;
  terms?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  sampleFee?: number | null;
  sampleLeadTime?: string | null;
  sampleRefundCondition?: string | null;
  productionDueDate?: string | null;
  productionOwnerId?: string | null;
  productionNote?: string | null;
  discountAmount?: number;
  shippingFee?: number;
  vatRate?: number;
  vatAmount?: number;
  requireItemClassification?: boolean;
  items: OrderItemInputPayload[];
};

export type UpdateOrderInput = CreateManualOrderInput;

export type EditOrderPaymentInput = {
  type: OrderPaymentType;
  method: OrderPaymentMethod;
  amount: number;
  paidAt: string;
  referenceCode?: string | null;
  note?: string | null;
  editReason: string;
};

export type UpdateOrderProductionInput = {
  productionOwnerId?: string | null;
  productionDueDate?: string | null;
  productionNote?: string | null;
};

export type UpdateOrderDeliveryInput = {
  deliveryMethodId?: string | null;
  deliveryOwnerId?: string | null;
  deliveryCarrierId?: string | null;
  deliveryTrackingCode?: string | null;
  deliveryRecipientName?: string | null;
  deliveryRecipientPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryExpectedAt?: string | null;
  deliveryNote?: string | null;
};
