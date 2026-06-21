import type { OrderDetailRecord } from "@/features/orders/order.types";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import type {
  OrderConfirmationDocument,
  OrderDeliveryDocument,
  OrderDocumentConfirmationItem,
  OrderDocumentData,
  OrderDocumentDeliveryRow,
  OrderDocumentProductionRow,
  OrderDocumentType,
  OrderDocumentPdfData,
  OrderProductionDocument,
} from "@/features/orders/order-document-types";

function productDisplayName(item: OrderDetailRecord["items"][number]): string {
  return [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—";
}

function mapVariantLines(item: OrderDetailRecord["items"][number]) {
  if (item.variants.length === 0) {
    return [
      {
        color: item.colorSnapshot,
        size: null,
        sku: item.skuSnapshot,
        quantity: item.quantity,
        unit: item.unit,
      },
    ];
  }
  return item.variants.map((variant) => ({
    color: variant.colorNameSnapshot,
    size: variant.sizeValue,
    sku: variant.skuSnapshot ?? item.skuSnapshot,
    quantity: variant.quantity,
    unit: variant.unit,
  }));
}

function mapConfirmationItems(order: OrderDetailRecord): OrderDocumentConfirmationItem[] {
  return order.items.map((item) => ({
    designImageUrl: item.designImageUrl,
    productName: productDisplayName(item),
    sku: item.skuSnapshot,
    description: item.description,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    quantity: item.quantity,
    unit: item.unit,
    productionLeadTime: item.productionLeadTime,
    variants: mapVariantLines(item),
  }));
}

function expandProductionRows(order: OrderDetailRecord): OrderDocumentProductionRow[] {
  const rows: OrderDocumentProductionRow[] = [];
  let stt = 1;

  for (const item of order.items) {
    const productName = productDisplayName(item);
    const variants = mapVariantLines(item);
    for (const variant of variants) {
      rows.push({
        stt: stt++,
        designImageUrl: item.designImageUrl,
        productName,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        quantity: variant.quantity,
        unit: variant.unit,
        description: item.description,
        productionLeadTime: item.productionLeadTime,
        note: item.itemNote,
      });
    }
  }

  return rows;
}

function expandDeliveryRows(order: OrderDetailRecord): OrderDocumentDeliveryRow[] {
  const rows: OrderDocumentDeliveryRow[] = [];
  let stt = 1;

  for (const item of order.items) {
    const productName = productDisplayName(item);
    const variants = mapVariantLines(item);
    for (const variant of variants) {
      rows.push({
        stt: stt++,
        productName,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        quantity: variant.quantity,
        unit: variant.unit,
        note: item.itemNote,
      });
    }
  }

  return rows;
}

function mapDocumentBase(order: OrderDetailRecord) {
  return {
    orderNo: order.orderNo,
    orderDate: order.orderDate,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    sourceQuoteNo: order.sourceQuoteNo,
    currency: order.currency,
    priceVatType: order.priceVatType,
    customerCompanyName: order.customerCompanyName,
    customerCode: order.customerCode,
    customerAddress: order.customerAddress,
    contactName: order.contactName,
    contactTitle: order.contactTitle,
    contactPhone: order.contactPhone,
    contactEmail: order.contactEmail,
    salesName: order.salesName,
    salesTitle: order.salesTitle,
    salesPhone: order.salesPhone,
    salesEmail: order.salesEmail,
    customerNote: order.customerNote,
    terms: order.terms,
    sampleFee: order.sampleFee,
    sampleLeadTime: order.sampleLeadTime,
    sampleRefundCondition: order.sampleRefundCondition,
    preparedBy: order.salesName,
    productionOwnerName: order.productionOwnerName,
    productionDueDate: order.productionDueDate,
    productionNote: order.productionNote,
    deliveryRecipientName: order.deliveryRecipientName,
    deliveryRecipientPhone: order.deliveryRecipientPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryMethodName: order.deliveryMethodName ?? order.deliveryMethod,
    deliveryCarrierName: order.deliveryCarrierName ?? order.deliveryCarrier,
    deliveryTrackingCode: order.deliveryTrackingCode,
    deliveryOwnerName: order.deliveryOwnerName,
    deliveryExpectedAt: order.deliveryExpectedAt,
    deliveredAt: order.deliveredAt,
    shippedAt: order.shippedAt,
    deliveryNote: order.deliveryNote,
  };
}

export function formatOrderConfirmationDocument(
  order: OrderDetailRecord,
): OrderConfirmationDocument {
  return {
    docType: "confirmation",
    ...mapDocumentBase(order),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingFee: order.shippingFee,
    vatAmount: order.vatAmount,
    totalAmount: order.totalAmount,
    paidAmount: order.financials.paidAmount,
    outstandingAmount: order.financials.outstandingAmount,
    items: mapConfirmationItems(order),
  };
}

export function formatOrderProductionDocument(
  order: OrderDetailRecord,
): OrderProductionDocument {
  return {
    docType: "production",
    ...mapDocumentBase(order),
    rows: expandProductionRows(order),
  };
}

export function formatOrderDeliveryDocument(order: OrderDetailRecord): OrderDeliveryDocument {
  return {
    docType: "delivery",
    ...mapDocumentBase(order),
    rows: expandDeliveryRows(order),
  };
}

export function formatOrderDocument(
  order: OrderDetailRecord,
  docType: OrderDocumentType,
): OrderDocumentData {
  if (docType === "confirmation") return formatOrderConfirmationDocument(order);
  if (docType === "production") return formatOrderProductionDocument(order);
  return formatOrderDeliveryDocument(order);
}

export function formatOrderDocumentPdfData(
  order: OrderDetailRecord,
  docType: OrderDocumentType,
  company: QuoteCompanyProfile,
  logoUrl: string | null,
): OrderDocumentPdfData {
  return {
    ...formatOrderDocument(order, docType),
    company,
    logoUrl,
  };
}

export function orderDocumentPdfFilename(
  docType: OrderDocumentType,
  orderNo: string,
): string {
  const safeOrderNo = orderNo.replace(/[^\w-]+/g, "-");
  const prefix =
    docType === "confirmation"
      ? "xac-nhan-don-hang"
      : docType === "production"
        ? "lenh-san-xuat"
        : "phieu-giao-hang";
  return `${prefix}-${safeOrderNo}.pdf`;
}
