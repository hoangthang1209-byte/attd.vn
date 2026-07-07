export type CostingComponentType =
  | "MATERIAL"
  | "RIB"
  | "CUTTING"
  | "SEWING"
  | "PRINTING"
  | "EMBROIDERY"
  | "WASH"
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
  warnings: string[];
};

export type CostingSaveResult = {
  calculationId: string;
  calculationCode: string;
  quoteId?: string;
  quoteNo?: string;
};
