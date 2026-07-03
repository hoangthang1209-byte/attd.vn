import "server-only";

import type { TechPackDetail } from "@/features/tech-pack/tech-pack.service";
import { prisma } from "@/lib/prisma";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import {
  PATTERN_STATUS_LABELS,
  TECH_PACK_STATUS_LABELS,
  TECH_PACK_SOURCE_TYPE_LABELS,
} from "@/features/tech-pack/tech-pack-labels";
import {
  ARTWORK_PLACEMENT_TYPE_LABELS,
  TECH_PACK_BOM_CATEGORY_LABELS,
} from "@/features/tech-pack/tech-pack-bom-labels";
import {
  getOrderItemProcessingMethodLabel,
  getOrderItemSupplySourceLabel,
} from "@/features/orders/order-item-classification";
import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import { resolveTechPackPdfWatermark } from "@/features/tech-pack/pdf/tech-pack-pdf-status";
import {
  formatViDate,
  formatViDateTime,
  mapTechPackAssetForPdf,
  sortSizeColumns,
} from "@/features/tech-pack/pdf/tech-pack-pdf-assets";
import type { TechPackPdfDto } from "@/features/tech-pack/pdf/tech-pack-pdf.types";

function sourceTypeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return (
    TECH_PACK_SOURCE_TYPE_LABELS[raw] ??
    getOrderItemSupplySourceLabel(raw as OrderItemSupplySource) ??
    raw
  );
}

function processingMethodLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return getOrderItemProcessingMethodLabel(raw as OrderItemProcessingMethod) ?? raw;
}

function placementTechnology(row: {
  placementType: string;
  printMethod: string | null;
  embroideryMethod: string | null;
  printMethodRef?: { code: string; name: string } | null;
}): string {
  if (row.placementType === "EMBROIDERY") return row.embroideryMethod ?? "Thêu";
  if (row.printMethodRef) return `${row.printMethodRef.code} — ${row.printMethodRef.name}`;
  if (row.printMethod) return row.printMethod;
  return (
    ARTWORK_PLACEMENT_TYPE_LABELS[row.placementType as keyof typeof ARTWORK_PLACEMENT_TYPE_LABELS] ??
    row.placementType
  );
}

function bomMasterCodes(row: {
  material?: { code: string } | null;
  trim?: { code: string } | null;
  supplierRef?: { code: string } | null;
}): string {
  return [
    row.material?.code ? `VL: ${row.material.code}` : null,
    row.trim?.code ? `PL: ${row.trim.code}` : null,
    row.supplierRef?.code ? `NCC: ${row.supplierRef.code}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function buildTechPackPdfDto(
  pack: TechPackDetail,
  baseUrl: string,
): Promise<TechPackPdfDto> {
  const [companySettings, branding, patternFiles] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
    pack.patternId
      ? prisma.patternFile.findMany({
          where: { patternId: pack.patternId },
          orderBy: { sortOrder: "asc" },
          select: {
            type: true,
            previewUrl: true,
            originalFileName: true,
            title: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const mappedAssets = pack.assets.map((a) => mapTechPackAssetForPdf(a, baseUrl));
  const construction = mappedAssets.filter((a) => a.section === "construction");
  const artworkAssets = mappedAssets.filter((a) => a.section === "artwork");
  const measurement = mappedAssets.filter((a) => a.section === "measurement");

  const patternPdf = patternFiles.find((f) => f.type === "PDF");
  const patternPdfPreviewUrl = patternPdf?.previewUrl
    ? resolveAbsoluteMediaUrl(patternPdf.previewUrl, baseUrl)
    : null;

  const sizeColumns = sortSizeColumns(
    Array.from(new Set(pack.measurements.flatMap((m) => m.values.map((v) => v.size)))),
  );

  const patternCode = pack.patternCodeSnapshot ?? pack.pattern?.code ?? null;
  const patternVersion =
    pack.patternVersionSnapshot ?? (pack.pattern ? String(pack.pattern.version) : null);

  const companyProfile = resolveQuoteCompanyProfile(companySettings);
  const logoUrl = resolveAbsoluteMediaUrl(
    branding.headerLogoUrl ?? branding.footerLogoUrl,
    baseUrl,
  );

  return {
    id: pack.id,
    code: pack.code,
    version: pack.version,
    status: pack.status,
    statusLabel: TECH_PACK_STATUS_LABELS[pack.status],
    title: pack.title,
    generatedAt: new Date().toISOString(),
    releasedAt: pack.releasedAt ? pack.releasedAt.toISOString() : null,
    releasedBy: pack.releasedBy,
    watermark: resolveTechPackPdfWatermark(pack.status),
    supersededBy: pack.supersededBy
      ? { code: pack.supersededBy.code, version: pack.supersededBy.version }
      : null,
    company: {
      brandName: companyProfile.brandName,
      legalName: companyProfile.legalName,
      logoUrl,
    },
    general: {
      createdDate: formatViDate(pack.createdAt),
      jobCode: pack.jobCodeSnapshot ?? pack.orderItemCodeSnapshot,
      orderCode: pack.orderCodeSnapshot,
      productName: pack.productNameSnapshot,
      productSku: pack.productSkuSnapshot,
      color: pack.colorSnapshot,
      quantity: pack.quantitySnapshot != null ? `${pack.quantitySnapshot}` : null,
      sizeRange: pack.sizeSnapshot,
      supplySource: sourceTypeLabel(pack.sourceType),
      processingMethod: processingMethodLabel(pack.processingMethod),
      productionOwner: pack.productionOwnerNameSnapshot,
      workshop: pack.workshopNameSnapshot,
      internalDeadline: formatViDate(pack.internalDeadlineSnapshot ?? pack.deadline),
      deliveryDeadline: formatViDate(pack.deliveryDeadlineSnapshot),
      customerName: pack.customerNameSnapshot,
      fitNote: pack.fitNote,
      constructionNote: pack.constructionNote,
      generalNote: pack.generalNote,
    },
    notes: {
      bom: pack.bomNotes,
      trims: pack.trimsNotes,
      print: pack.printMethodNotes,
      embroidery: pack.embroideryNotes,
      qc: pack.qcNotes,
      production: pack.productionNotes,
      internal: pack.internalNotes,
    },
    bomRows: (pack.bomItems ?? []).map((row) => ({
      id: row.id,
      categoryLabel: TECH_PACK_BOM_CATEGORY_LABELS[row.category],
      itemName: row.itemName,
      masterCodes: bomMasterCodes(row),
      specification: row.specification,
      color: row.color,
      supplier: row.supplierRef?.code
        ? `${row.supplierRef.code} — ${row.supplier ?? ""}`
        : row.supplier,
      unit: row.unit,
      consumption: row.consumption,
      wastePercent: row.wastePercent,
      notes: row.notes,
    })),
    placements: (pack.artworkPlacements ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      bodyPart: row.bodyPart,
      sizeText: [row.width, row.height].filter(Boolean).join(" × "),
      technology: placementTechnology(row),
      inkColors: row.inkColors,
      threadColors: row.threadColors,
      notes: row.notes,
      artworkFileName: row.artworkAsset?.originalFileName ?? null,
      previewUrl: row.artworkAsset?.previewUrl
        ? resolveAbsoluteMediaUrl(row.artworkAsset.previewUrl, baseUrl)
        : null,
    })),
    measurements: pack.measurements.map((m) => ({
      id: m.id,
      pointOfMeasure: m.pointOfMeasure,
      description: m.description,
      tolerance: m.tolerance,
      values: Object.fromEntries(m.values.map((v) => [v.size, v.value])),
    })),
    sizeColumns,
    pattern:
      patternCode || pack.pattern || pack.patternExceptionReason
        ? {
            code: patternCode,
            version: patternVersion,
            name: pack.pattern?.name ?? null,
            baseSize: pack.pattern?.baseSize ?? null,
            sizeRange: pack.pattern?.sizeRange ?? null,
            gradingRule: pack.pattern?.gradingRule ?? null,
            statusLabel: pack.pattern?.status
              ? PATTERN_STATUS_LABELS[pack.pattern.status]
              : null,
            exceptionReason: pack.patternExceptionReason,
            pdfPreviewUrl: patternPdfPreviewUrl,
            pdfFileName: patternPdf?.originalFileName ?? patternPdf?.title ?? null,
          }
        : null,
    assets: {
      construction,
      artwork: artworkAssets,
      measurement,
      bom: mappedAssets.filter((a) => a.section === "bom"),
    },
  };
}

export { formatViDateTime };
