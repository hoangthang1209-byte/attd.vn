import type { OrderStatus, QuotePriceVatType } from "@prisma/client";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

export type OrderDocumentType = "confirmation" | "production" | "delivery";

export const ORDER_DOCUMENT_TITLES: Record<OrderDocumentType, string> = {
  confirmation: "XÁC NHẬN ĐƠN HÀNG",
  production: "LỆNH SẢN XUẤT",
  delivery: "PHIẾU GIAO HÀNG",
};

export type OrderDocumentVariantLine = {
  color: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
};

export type OrderDocumentConfirmationItem = {
  designImageUrl: string | null;
  productName: string;
  sku: string | null;
  description: string | null;
  unitPrice: number;
  lineTotal: number;
  quantity: number;
  unit: string;
  productionLeadTime: string | null;
  variants: OrderDocumentVariantLine[];
};

export type OrderDocumentProductionRow = {
  stt: number;
  designImageUrl: string | null;
  productName: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
  description: string | null;
  productionLeadTime: string | null;
  note: string | null;
};

export type OrderDocumentDeliveryRow = {
  stt: number;
  productName: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
  note: string | null;
};

export type OrderDocumentBase = {
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  statusLabel: string;
  sourceQuoteNo: string | null;
  currency: string;
  priceVatType: QuotePriceVatType;
  customerCompanyName: string | null;
  customerCode: string | null;
  customerAddress: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  salesName: string | null;
  salesTitle: string | null;
  salesPhone: string | null;
  salesEmail: string | null;
  customerNote: string | null;
  terms: string | null;
  sampleFee: number | null;
  sampleLeadTime: string | null;
  sampleRefundCondition: string | null;
  preparedBy: string | null;
  productionOwnerName: string | null;
  productionDueDate: string | null;
  productionNote: string | null;
  deliveryRecipientName: string | null;
  deliveryRecipientPhone: string | null;
  deliveryAddress: string | null;
  deliveryMethodName: string | null;
  deliveryCarrierName: string | null;
  deliveryTrackingCode: string | null;
  deliveryOwnerName: string | null;
  deliveryExpectedAt: string | null;
  deliveredAt: string | null;
  shippedAt: string | null;
  deliveryNote: string | null;
};

export type OrderConfirmationDocument = OrderDocumentBase & {
  docType: "confirmation";
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  items: OrderDocumentConfirmationItem[];
};

export type OrderProductionDocument = OrderDocumentBase & {
  docType: "production";
  rows: OrderDocumentProductionRow[];
};

export type OrderDeliveryDocument = OrderDocumentBase & {
  docType: "delivery";
  rows: OrderDocumentDeliveryRow[];
};

export type OrderDocumentData =
  | OrderConfirmationDocument
  | OrderProductionDocument
  | OrderDeliveryDocument;

export type OrderDocumentPdfData = OrderDocumentData & {
  company: QuoteCompanyProfile;
  logoUrl: string | null;
};

export type OrderDocumentAvailability = {
  available: boolean;
  reason: string | null;
};
