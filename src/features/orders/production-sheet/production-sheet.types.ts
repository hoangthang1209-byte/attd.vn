import type { OrderStatus } from "@prisma/client";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import type { ProductionReadinessItem } from "@/features/orders/production-readiness.service";

export type ProductionSheetVariantRow = {
  stt: number;
  designImageUrl: string | null;
  productName: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
  note: string | null;
};

export type ProductionSheetFileRow = {
  id: string;
  typeLabel: string;
  title: string;
  version: number;
  appliesToLabel: string;
  note: string | null;
  filename: string;
  mimeType: string;
  format: string | null;
  sizeBytes: number;
  previewUrl: string | null;
  isPreviewable: boolean;
  accessLabel: string;
};

export type ProductionSheetBomRow = {
  materialTypeLabel: string;
  materialName: string;
  materialCode: string | null;
  unit: string;
  consumptionPerUnit: string;
  wastagePercent: string;
  requiredQuantity: string;
  availableQuantity: string | null;
  shortageQuantity: string | null;
  readinessLabel: string | null;
  requiredQuantityOverridden: boolean;
  formula: string;
  note: string | null;
};

export type ProductionSheetItemBom = {
  orderItemId: string;
  productName: string;
  totalQuantity: number;
  rows: ProductionSheetBomRow[];
};

export type ProductionSheetMaterialSummaryRow = {
  stt: number;
  materialTypeLabel: string;
  materialName: string;
  materialCode: string | null;
  unit: string;
  totalRequiredQuantity: string;
  availableQuantity: string | null;
  shortageQuantity: string | null;
  readinessLabel: string;
  notes: string[];
};

export type ProductionSheetAcknowledgement = {
  acknowledgedAt: string;
  detail: string | null;
};

export type ProductionSheetExecutionSummary = {
  stageProgressLabel: string;
  qcStatusLabel: string;
  qcPassedQuantity: string;
  qcInspectedQuantity: string;
  packingLabel: string;
  handoverStateLabel: string;
  orderReadinessLabel?: string;
  evidenceThumbnails: Array<{ url: string; title: string }>;
};

export type ProductionSheetViewModel = {
  orderId: string;
  orderNo: string;
  sourceQuoteNo: string | null;
  orderDate: string;
  issuedAt: string;
  customerCompanyName: string | null;
  salesName: string | null;
  salesTitle: string | null;
  productionOwnerName: string | null;
  productionDueDate: string | null;
  productionNote: string | null;
  status: OrderStatus;
  statusLabel: string;
  variantRows: ProductionSheetVariantRow[];
  orderLevelFiles: ProductionSheetFileRow[];
  itemLevelFiles: Array<{
    orderItemId: string;
    productName: string;
    files: ProductionSheetFileRow[];
  }>;
  itemBoms: ProductionSheetItemBom[];
  materialSummary: ProductionSheetMaterialSummaryRow[];
  readiness: {
    items: ProductionReadinessItem[];
    isReady: boolean;
  };
  acknowledgement: ProductionSheetAcknowledgement | null;
  executionSummary: ProductionSheetExecutionSummary | null;
  adminOrderUrl: string;
};

export type ProductionSheetPdfData = ProductionSheetViewModel & {
  company: QuoteCompanyProfile;
  logoUrl: string | null;
  printedAt: string;
};
