import type { TechPackBomCategory } from "@prisma/client";
import { TECH_PACK_BOM_CATEGORY_LABELS } from "@/features/tech-pack/tech-pack-bom-labels";
import { ARTWORK_PLACEMENT_TYPE_LABELS } from "@/features/tech-pack/tech-pack-bom-labels";

export type TechPackDiffType = "ADDED" | "REMOVED" | "CHANGED";
export type TechPackDiffSeverity = "info" | "warning";

export type TechPackDiffItem = {
  section: string;
  type: TechPackDiffType;
  label: string;
  before: string | null;
  after: string | null;
  severity: TechPackDiffSeverity;
};

export type TechPackDiffResult = {
  hasPrevious: boolean;
  message: string | null;
  items: TechPackDiffItem[];
};

type BomRow = {
  sortOrder: number;
  category: TechPackBomCategory;
  itemName: string;
  specification: string | null;
  color: string | null;
  supplier: string | null;
  unit: string | null;
  consumption: string | null;
  materialId: string | null;
  trimId: string | null;
  supplierId: string | null;
};

type ArtworkRow = {
  sortOrder: number;
  placementType: string;
  title: string | null;
  bodyPart: string | null;
  width: string | null;
  height: string | null;
  printMethod: string | null;
  embroideryMethod: string | null;
};

type MeasurementRow = {
  sortOrder: number;
  pointOfMeasure: string;
  description: string | null;
  tolerance: string | null;
  values: Array<{ size: string; value: string }>;
};

export type TechPackDiffSnapshot = {
  bomItems: BomRow[];
  artworkPlacements: ArtworkRow[];
  measurements: MeasurementRow[];
  patternCodeSnapshot: string | null;
  patternVersionSnapshot: string | null;
  patternId: string | null;
  patternCode: string | null;
  patternVersion: number | null;
  qcNotes: string | null;
  productionNotes: string | null;
  printMethodNotes: string | null;
  embroideryNotes: string | null;
  patternExceptionReason: string | null;
};

function bomFingerprint(row: BomRow): string {
  return [
    row.category,
    row.itemName,
    row.specification ?? "",
    row.color ?? "",
    row.supplier ?? "",
    row.unit ?? "",
    row.consumption ?? "",
    row.materialId ?? "",
    row.trimId ?? "",
    row.supplierId ?? "",
  ].join("|");
}

function bomLabel(row: BomRow): string {
  const cat = TECH_PACK_BOM_CATEGORY_LABELS[row.category] ?? row.category;
  return `${cat}: ${row.itemName}`;
}

function artworkFingerprint(row: ArtworkRow): string {
  return [
    row.placementType,
    row.title ?? "",
    row.bodyPart ?? "",
    row.width ?? "",
    row.height ?? "",
    row.printMethod ?? "",
    row.embroideryMethod ?? "",
  ].join("|");
}

function artworkLabel(row: ArtworkRow): string {
  const type =
    ARTWORK_PLACEMENT_TYPE_LABELS[row.placementType as keyof typeof ARTWORK_PLACEMENT_TYPE_LABELS] ??
    row.placementType;
  return row.title?.trim() ? `${type} — ${row.title}` : type;
}

function measurementFingerprint(row: MeasurementRow): string {
  const values = [...row.values]
    .sort((a, b) => a.size.localeCompare(b.size))
    .map((v) => `${v.size}:${v.value}`)
    .join(";");
  return [row.pointOfMeasure, row.description ?? "", row.tolerance ?? "", values].join("|");
}

function measurementLabel(row: MeasurementRow): string {
  return row.pointOfMeasure;
}

function diffTextField(
  items: TechPackDiffItem[],
  section: string,
  label: string,
  before: string | null,
  after: string | null,
) {
  const b = before?.trim() || null;
  const a = after?.trim() || null;
  if (b === a) return;
  if (!b && a) {
    items.push({ section, type: "ADDED", label, before: null, after: a, severity: "info" });
  } else if (b && !a) {
    items.push({ section, type: "REMOVED", label, before: b, after: null, severity: "info" });
  } else {
    items.push({ section, type: "CHANGED", label, before: b, after: a, severity: "info" });
  }
}

export function buildTechPackDiff(
  current: TechPackDiffSnapshot,
  previous: TechPackDiffSnapshot | null,
): TechPackDiffResult {
  if (!previous) {
    return {
      hasPrevious: false,
      message: "Chưa có bản phát hành trước để so sánh.",
      items: [],
    };
  }

  const items: TechPackDiffItem[] = [];

  const prevBom = [...previous.bomItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const currBom = [...current.bomItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const prevBomFp = prevBom.map(bomFingerprint);
  const currBomFp = currBom.map(bomFingerprint);

  const maxBom = Math.max(prevBom.length, currBom.length);
  for (let i = 0; i < maxBom; i += 1) {
    const prev = prevBom[i];
    const curr = currBom[i];
    if (!prev && curr) {
      items.push({
        section: "BOM",
        type: "ADDED",
        label: bomLabel(curr),
        before: null,
        after: bomLabel(curr),
        severity: "info",
      });
    } else if (prev && !curr) {
      items.push({
        section: "BOM",
        type: "REMOVED",
        label: bomLabel(prev),
        before: bomLabel(prev),
        after: null,
        severity: "info",
      });
    } else if (prev && curr && prevBomFp[i] !== currBomFp[i]) {
      items.push({
        section: "BOM",
        type: "CHANGED",
        label: bomLabel(curr),
        before: bomLabel(prev),
        after: bomLabel(curr),
        severity: "warning",
      });
    }
  }

  const prevArt = [...previous.artworkPlacements].sort((a, b) => a.sortOrder - b.sortOrder);
  const currArt = [...current.artworkPlacements].sort((a, b) => a.sortOrder - b.sortOrder);
  const maxArt = Math.max(prevArt.length, currArt.length);
  for (let i = 0; i < maxArt; i += 1) {
    const prev = prevArt[i];
    const curr = currArt[i];
    if (!prev && curr) {
      items.push({
        section: "Artwork",
        type: "ADDED",
        label: artworkLabel(curr),
        before: null,
        after: artworkLabel(curr),
        severity: "info",
      });
    } else if (prev && !curr) {
      items.push({
        section: "Artwork",
        type: "REMOVED",
        label: artworkLabel(prev),
        before: artworkLabel(prev),
        after: null,
        severity: "info",
      });
    } else if (prev && curr && artworkFingerprint(prev) !== artworkFingerprint(curr)) {
      items.push({
        section: "Artwork",
        type: "CHANGED",
        label: artworkLabel(curr),
        before: artworkLabel(prev),
        after: artworkLabel(curr),
        severity: "warning",
      });
    }
  }

  const prevMeas = [...previous.measurements].sort((a, b) => a.sortOrder - b.sortOrder);
  const currMeas = [...current.measurements].sort((a, b) => a.sortOrder - b.sortOrder);
  const maxMeas = Math.max(prevMeas.length, currMeas.length);
  for (let i = 0; i < maxMeas; i += 1) {
    const prev = prevMeas[i];
    const curr = currMeas[i];
    if (!prev && curr) {
      items.push({
        section: "Thông số",
        type: "ADDED",
        label: measurementLabel(curr),
        before: null,
        after: measurementLabel(curr),
        severity: "info",
      });
    } else if (prev && !curr) {
      items.push({
        section: "Thông số",
        type: "REMOVED",
        label: measurementLabel(prev),
        before: measurementLabel(prev),
        after: null,
        severity: "info",
      });
    } else if (prev && curr && measurementFingerprint(prev) !== measurementFingerprint(curr)) {
      items.push({
        section: "Thông số",
        type: "CHANGED",
        label: measurementLabel(curr),
        before: measurementLabel(prev),
        after: measurementLabel(curr),
        severity: "warning",
      });
    }
  }

  const prevPattern =
    previous.patternCode && previous.patternVersion != null
      ? `${previous.patternCode} v${previous.patternVersion}`
      : previous.patternCodeSnapshot && previous.patternVersionSnapshot
        ? `${previous.patternCodeSnapshot} v${previous.patternVersionSnapshot}`
        : null;
  const currPattern =
    current.patternCode && current.patternVersion != null
      ? `${current.patternCode} v${current.patternVersion}`
      : current.patternCodeSnapshot && current.patternVersionSnapshot
        ? `${current.patternCodeSnapshot} v${current.patternVersionSnapshot}`
        : null;
  diffTextField(items, "Rập", "Rập đã chọn", prevPattern, currPattern);
  diffTextField(
    items,
    "Rập",
    "Lý do ngoại lệ rập",
    previous.patternExceptionReason,
    current.patternExceptionReason,
  );

  diffTextField(items, "Ghi chú", "Ghi chú QC", previous.qcNotes, current.qcNotes);
  diffTextField(items, "Ghi chú", "Ghi chú sản xuất", previous.productionNotes, current.productionNotes);
  diffTextField(items, "Ghi chú", "Ghi chú in", previous.printMethodNotes, current.printMethodNotes);
  diffTextField(items, "Ghi chú", "Ghi chú thêu", previous.embroideryNotes, current.embroideryNotes);

  return {
    hasPrevious: true,
    message: items.length > 0 ? null : "Không có thay đổi so với bản phát hành trước.",
    items,
  };
}
