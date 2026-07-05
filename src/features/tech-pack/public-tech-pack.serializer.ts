import type {
  TechPackPdfAssetDto,
  TechPackPdfBomRowDto,
  TechPackPdfDto,
} from "@/features/tech-pack/pdf/tech-pack-pdf.types";

function stripSupplierMasterCodes(masterCodes: string): string {
  return masterCodes
    .split(" · ")
    .filter((part) => !part.trim().startsWith("NCC:"))
    .join(" · ");
}

function serializePublicTechPackAsset(asset: TechPackPdfAssetDto): TechPackPdfAssetDto {
  return {
    ...asset,
    note: null,
  };
}

function serializePublicTechPackBomRow(row: TechPackPdfBomRowDto): TechPackPdfBomRowDto {
  return {
    ...row,
    masterCodes: stripSupplierMasterCodes(row.masterCodes),
    supplier: null,
  };
}

export function serializePublicTechPack(dto: TechPackPdfDto): TechPackPdfDto {
  return {
    ...dto,
    releasedBy: null,
    general: {
      ...dto.general,
      productionOwner: null,
      workshop: null,
      internalDeadline: null,
    },
    notes: {
      ...dto.notes,
      qc: null,
      production: null,
      internal: null,
    },
    bomRows: dto.bomRows.map(serializePublicTechPackBomRow),
    assets: {
      construction: dto.assets.construction.map(serializePublicTechPackAsset),
      artwork: dto.assets.artwork.map(serializePublicTechPackAsset),
      measurement: dto.assets.measurement.map(serializePublicTechPackAsset),
      bom: dto.assets.bom.map(serializePublicTechPackAsset),
    },
  };
}

export function serializePublicTechPackForDocument(dto: TechPackPdfDto): TechPackPdfDto {
  return serializePublicTechPack(dto);
}

export function serializePublicTechPackForPdf(dto: TechPackPdfDto): TechPackPdfDto {
  return serializePublicTechPack(dto);
}
