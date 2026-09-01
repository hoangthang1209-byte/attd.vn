import type {
  PricingCalculationStatus,
  PricingCalculationType,
  PricingServiceType,
} from "@prisma/client";

export type PriceGroupRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductPriceTierRecord = {
  id: string;
  productId: string;
  variantId: string | null;
  priceGroupId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
  costPrice: number | null;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  note: string | null;
  productName?: string;
  variantLabel?: string;
  priceGroupName?: string;
  priceGroupCode?: string;
  createdAt: string;
  updatedAt: string;
};

export type ServicePriceRuleRecord = {
  id: string;
  serviceType: PricingServiceType;
  name: string;
  priceGroupId: string | null;
  minQuantity: number;
  maxQuantity: number | null;
  calculationType: PricingCalculationType;
  unitPrice: number;
  setupFee: number;
  currency: string;
  isActive: boolean;
  note: string | null;
  priceGroupName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PricingServiceOptionInput = {
  serviceType?: PricingServiceType;
  ruleId?: string;
  name?: string;
  calculationType?: PricingCalculationType;
  quantity?: number;
  unitPrice?: number;
  setupFee?: number;
  manualAmount?: number;
};

export type PricingItemInput = {
  productId?: string;
  variantId?: string;
  productName?: string;
  quantity: number;
  unit?: string;
  serviceOptions?: PricingServiceOptionInput[];
  manualUnitPrice?: number;
  manualOverrideReason?: string;
  discountAmount?: number;
};

export type CalculatePricingInput = {
  leadId?: string;
  customerId?: string;
  contactId?: string;
  priceGroupId?: string;
  items: PricingItemInput[];
  discountAmount?: number;
  shippingFee?: number;
  vatRate?: number;
  manualTotalAmount?: number;
  manualOverrideReason?: string;
  internalNote?: string;
};

export type PricingItemBreakdown = {
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unit: string;
  baseUnitPrice: number;
  serviceFee: number;
  setupFee: number;
  unitPrice: number;
  discountAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  costEstimate: number | null;
  marginAmount: number | null;
  marginRate: number | null;
  manualOverride: boolean;
  manualUnitPrice: number | null;
  manualOverrideReason: string | null;
  pricingSnapshot: Record<string, unknown>;
};

export type CalculatePricingResult = {
  priceGroup: PriceGroupRecord | null;
  items: PricingItemBreakdown[];
  subtotal: number;
  serviceTotal: number;
  setupTotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  calculatedTotalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
  manualOverrideReason: string | null;
  warnings: string[];
};

export type PricingCalculationListRecord = {
  id: string;
  code: string;
  leadId: string | null;
  customerId: string | null;
  priceGroupId: string | null;
  status: PricingCalculationStatus;
  totalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
  leadLabel: string | null;
  customerLabel: string | null;
  priceGroupName: string | null;
  isFinal: boolean;
  finalizedAt: string | null;
  revisionLabel: string | null;
  createdAt: string;
};

export type PricingOverviewStats = {
  activePriceGroups: number;
  productTierCount: number;
  serviceRuleCount: number;
  recentCalculations: PricingCalculationListRecord[];
};
