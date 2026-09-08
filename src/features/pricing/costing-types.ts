import type { CostingSourceType, PricingCalculationType } from "@prisma/client";

export type CostingComponentType =
  | "MATERIAL"
  | "RIB"
  | "CUTTING"
  | "SEWING"
  | "PRINTING"
  | "EMBROIDERY"
  | "WASH"
  | "FINISHING"
  | "PACKAGING"
  | "LOGISTICS"
  | "OTHER";

export type CostingComponentInput = {
  key?: string;
  label: string;
  type?: CostingComponentType;
  unitCost?: number;
  totalCost?: number;
  quantityFactor?: number;
  note?: string;
};

export type CostingQuantityBreakResult = {
  quantity: number;
  totalCostPerUnit: number;
  suggestedSellingPricePerUnit: number;
  revenueBeforeVat: number;
  grossProfit: number;
  actualMarginRate: number;
  finalQuotePrice: number;
};

export type CostingLineSection = "MATERIAL" | "PROCESS" | "OTHER";
export type CostingLineOrigin = "LIBRARY" | "CUSTOM" | "LEGACY";
export type CostingPricingBasis =
  | "LEGACY_YIELD"
  | "UNIT_TIMES_CONSUMPTION"
  | "PER_ITEM"
  | "PER_POSITION"
  | "PER_ORDER"
  | "MANUAL";

export type CostingStructuredLine = {
  key: string;
  section: CostingLineSection;
  componentType: CostingComponentType;
  origin: CostingLineOrigin;
  pricingBasis: CostingPricingBasis;
  label: string;
  sourceType?: CostingSourceType | "CUSTOM" | "LEGACY" | null;
  sourceId?: string | null;
  sourceCode?: string | null;
  sourceComposition?: string | null;
  sourceGsm?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  sourcePriceId?: string | null;
  unitPrice: number;
  referenceUnitPrice?: number | null;
  unit: string;
  calculationType?: PricingCalculationType | null;
  consumption?: number | null;
  quantityFactor?: number | null;
  costPerUnit: number;
  totalCost: number;
  isOverride?: boolean;
  note?: string | null;
};

export type CostingCalculatorInput = {
  productId?: string;
  variantId?: string;
  customProductName?: string;
  quantity: number;
  unit?: string;
  materialName?: string;
  gsm?: number;
  fabricPrice?: number;
  fabricConsumption?: number;
  fabricCostPerUnit?: number;
  ribCostPerUnit?: number;
  components?: CostingComponentInput[];
  /** V2 structured rows. When present (or workspaceVersion=2), these replace singleton fabric/rib math. */
  workspaceVersion?: 2;
  costLines?: CostingStructuredLine[];
  overheadRate?: number;
  targetMarginRate?: number;
  vatRate?: number;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  priceGroupId?: string;
  internalNote?: string;
  createQuote?: boolean;
  quantityBreaks?: CostingQuantityBreakResult[];
};

export type CostingComponentBreakdown = {
  key: string;
  label: string;
  type: CostingComponentType;
  unitCost: number;
  totalCost: number;
  quantityFactor: number;
  note: string | null;
};

export type CostingCalculatorResult = {
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unit: string;
  materialName: string | null;
  gsm: number | null;
  fabricPrice: number;
  fabricConsumption: number;
  fabricCostPerUnit: number;
  ribCostPerUnit: number;
  materialCostPerUnit: number;
  processCostPerUnit: number;
  otherCostPerUnit?: number;
  componentCostPerUnit: number;
  overheadRate: number;
  overheadCostPerUnit: number;
  totalCostPerUnit: number;
  totalCost: number;
  targetMarginRate: number;
  suggestedSellingPricePerUnit: number;
  revenueBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  finalQuotePrice: number;
  grossProfit: number;
  actualMarginRate: number;
  components: CostingComponentBreakdown[];
  costLines?: CostingStructuredLine[];
  workspaceVersion?: 2;
  warnings: string[];
};

export type CostingSaveResult = {
  calculationId: string;
  calculationCode: string;
  quoteId?: string;
  quoteNo?: string;
};

export type CostingPreviewContext = {
  productName?: string | null;
  variantName?: string | null;
};
