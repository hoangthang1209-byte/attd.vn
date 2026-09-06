import type {
  ItemProductionRiskStatus,
  ItemProductionStatus,
  OrderStatus,
  QuoteStatus,
} from "@prisma/client";

/** Quote statuses that still represent active commercial work. */
export const OPEN_QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED"] as const satisfies readonly QuoteStatus[];

/** Orders still operationally active (not completed/cancelled). */
export const ACTIVE_ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
] as const satisfies readonly OrderStatus[];

/** Item production rows worth summarizing on Customer 360. */
export const ACTIVE_ITEM_PRODUCTION_STATUSES = [
  "DRAFT",
  "PLANNED",
  "IN_PRODUCTION",
  "FINISHING",
  "ON_HOLD",
] as const satisfies readonly ItemProductionStatus[];

export const CUSTOMER_360_ORDER_LIST_LIMIT = 20;
export const CUSTOMER_360_OPEN_QUOTE_LIMIT = 20;
export const CUSTOMER_360_PRODUCTION_LIMIT = 10;
export const CUSTOMER_360_PURCHASED_PRODUCT_LIMIT = 50;

export type CustomerAccountOverviewCapabilities = {
  includeQuotes: boolean;
  includeOrders: boolean;
  includeFinancials: boolean;
  includeProduction: boolean;
  canCreateQuote: boolean;
};

export type CustomerAccountKpis = {
  totalOrders: number;
  /** Sum of Order.totalAmount for non-cancelled orders. Null when financials hidden. */
  totalOrderValue: number | null;
  openQuotations: number;
  activeOrders: number;
  lastOrderDate: string | null;
};

export type CustomerOpenQuoteRow = {
  id: string;
  quoteNo: string;
  quoteDate: string | null;
  contactName: string | null;
  status: QuoteStatus;
  totalAmount: number | null;
  validUntil: string | null;
};

export type CustomerOrderRow = {
  id: string;
  orderNo: string;
  sourceQuoteNo: string | null;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number | null;
  /** Compact production hint when available (e.g. progress / risk). */
  productionSummary: string | null;
};

export type CustomerActiveProductionRow = {
  orderId: string;
  orderNo: string;
  orderItemId: string;
  productName: string;
  quantity: number;
  unit: string;
  progressPercent: number;
  supplierName: string | null;
  riskStatus: ItemProductionRiskStatus;
  nextAction: string | null;
  nextActionDueDate: string | null;
  productionStatus: ItemProductionStatus;
};

export type CustomerPurchasedProductRow = {
  /** Stable group key: productId or snapshot fallback. */
  groupKey: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  lastOrderId: string;
  lastOrderNo: string;
  lastOrderDate: string;
  lastQuantity: number;
  lastUnit: string;
  lastUnitPrice: number | null;
  lastQuotedUnitCost: number | null;
  lastQuotedMarginRate: number | null;
  orderCount: number;
  lastSupplierName: string | null;
};

export type CustomerAccountOverview = {
  customerId: string;
  customerName: string;
  customerCode: string;
  capabilities: CustomerAccountOverviewCapabilities;
  kpis: CustomerAccountKpis;
  openQuotes: CustomerOpenQuoteRow[];
  orders: CustomerOrderRow[];
  ordersTotalCount: number;
  activeProduction: CustomerActiveProductionRow[];
  purchasedProducts: CustomerPurchasedProductRow[];
};
