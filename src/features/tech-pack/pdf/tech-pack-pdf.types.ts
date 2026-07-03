import type { TechPackStatus } from "@prisma/client";

export type TechPackPdfAssetSection = "construction" | "artwork" | "measurement" | "bom";

export type TechPackPdfAssetDto = {
  id: string;
  section: TechPackPdfAssetSection;
  type: string;
  typeLabel: string;
  title: string | null;
  previewUrl: string | null;
  isPreviewable: boolean;
  isPdfPreview: boolean;
  originalFileName: string | null;
  note: string | null;
};

export type TechPackPdfBomRowDto = {
  id: string;
  categoryLabel: string;
  itemName: string;
  masterCodes: string;
  specification: string | null;
  color: string | null;
  supplier: string | null;
  unit: string | null;
  consumption: string | null;
  wastePercent: string | null;
  notes: string | null;
};

export type TechPackPdfPlacementDto = {
  id: string;
  title: string | null;
  bodyPart: string | null;
  sizeText: string;
  technology: string;
  inkColors: string | null;
  threadColors: string | null;
  notes: string | null;
  artworkFileName: string | null;
  previewUrl: string | null;
};

export type TechPackPdfMeasurementRowDto = {
  id: string;
  pointOfMeasure: string;
  description: string | null;
  tolerance: string | null;
  values: Record<string, string>;
};

export type TechPackPdfPatternSnapshotDto = {
  code: string | null;
  version: string | null;
  name: string | null;
  baseSize: string | null;
  sizeRange: string | null;
  gradingRule: string | null;
  statusLabel: string | null;
  exceptionReason: string | null;
  pdfPreviewUrl: string | null;
  pdfFileName: string | null;
};

export type TechPackPdfDto = {
  id: string;
  code: string;
  version: number;
  status: TechPackStatus;
  statusLabel: string;
  title: string | null;
  generatedAt: string;
  releasedAt: string | null;
  releasedBy: string | null;
  watermark: import("@/features/tech-pack/pdf/tech-pack-pdf-status").TechPackPdfWatermark;
  supersededBy: { code: string; version: number } | null;
  company: {
    brandName: string;
    legalName: string | null;
    logoUrl: string | null;
  };
  general: {
    createdDate: string | null;
    jobCode: string | null;
    orderCode: string | null;
    productName: string | null;
    productSku: string | null;
    color: string | null;
    quantity: string | null;
    sizeRange: string | null;
    supplySource: string | null;
    processingMethod: string | null;
    productionOwner: string | null;
    workshop: string | null;
    internalDeadline: string | null;
    deliveryDeadline: string | null;
    customerName: string | null;
    fitNote: string | null;
    constructionNote: string | null;
    generalNote: string | null;
  };
  notes: {
    bom: string | null;
    trims: string | null;
    print: string | null;
    embroidery: string | null;
    qc: string | null;
    production: string | null;
    internal: string | null;
  };
  bomRows: TechPackPdfBomRowDto[];
  placements: TechPackPdfPlacementDto[];
  measurements: TechPackPdfMeasurementRowDto[];
  sizeColumns: string[];
  pattern: TechPackPdfPatternSnapshotDto | null;
  assets: {
    construction: TechPackPdfAssetDto[];
    artwork: TechPackPdfAssetDto[];
    measurement: TechPackPdfAssetDto[];
    bom: TechPackPdfAssetDto[];
  };
};
