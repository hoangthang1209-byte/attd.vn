import type { CostingStructuredLine } from "@/features/pricing/costing-types";

function normalizeCostingLabel(label: string): string {
  return label
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function hasLibrarySource(line: CostingStructuredLine): boolean {
  const sourceType = line.sourceType?.trim();
  const sourceId = line.sourceId?.trim();
  if (!sourceId || !sourceType) return false;
  return sourceType !== "CUSTOM" && sourceType !== "LEGACY";
}

function providerIdentity(line: CostingStructuredLine): string {
  return line.sourcePriceId?.trim() || line.supplierId?.trim() || "";
}

function libraryIdentity(line: CostingStructuredLine): string | null {
  if (!hasLibrarySource(line)) return null;
  return `lib:${line.sourceType}:${line.sourceId!.trim()}:${providerIdentity(line)}`;
}

function logicalIdentity(line: CostingStructuredLine): string | null {
  const label = normalizeCostingLabel(line.label);
  if (!label) return null;
  return `logical:${line.section}:${label}:${line.pricingBasis}`;
}

function incomingMatchesExisting(existing: CostingStructuredLine, incoming: CostingStructuredLine): boolean {
  const incomingLibrary = libraryIdentity(incoming);
  const existingLibrary = libraryIdentity(existing);

  if (incomingLibrary) {
    if (existingLibrary) return incomingLibrary === existingLibrary;
    return logicalIdentity(existing) != null && logicalIdentity(existing) === logicalIdentity(incoming);
  }

  return logicalIdentity(existing) != null && logicalIdentity(existing) === logicalIdentity(incoming);
}

export type BomMergeResult = {
  lines: CostingStructuredLine[];
  added: number;
  skipped: number;
};

/** Additive BOM apply: keep existing rows, append only missing logical items. Never overwrite matches. */
export function mergeBomCostLines(
  existing: CostingStructuredLine[],
  incoming: CostingStructuredLine[],
): BomMergeResult {
  const lines = [...existing];
  let added = 0;
  let skipped = 0;

  for (const candidate of incoming) {
    const duplicate = lines.some((row) => incomingMatchesExisting(row, candidate));
    if (duplicate) {
      skipped += 1;
      continue;
    }
    lines.push(candidate);
    added += 1;
  }

  return { lines, added, skipped };
}

export function formatBomMergeToast(added: number, skipped: number): string {
  return `Đã thêm ${added} hạng mục, bỏ qua ${skipped} hạng mục đã có`;
}
