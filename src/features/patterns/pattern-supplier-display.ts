export type PatternSupplierSnapshotSource = {
  code?: string | null;
  name?: string | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  patternSupplier?: {
    code?: string | null;
    name?: string | null;
    contact?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

export function formatPatternSupplierListLabel(
  source: PatternSupplierSnapshotSource | null | undefined,
): string {
  if (!source) return "—";
  const code = source.patternSupplier?.code ?? source.code ?? "";
  const name = source.patternSupplier?.name ?? source.name ?? "";
  if (code && name) return `${code} — ${name}`;
  return name || code || "—";
}

export function formatPatternSupplierPickerLabel(
  source: PatternSupplierSnapshotSource | null | undefined,
): string | null {
  const name = source?.patternSupplier?.name ?? source?.name ?? "";
  return name.trim() || null;
}

export function patternSourceShowsSupplier(
  sourceType: string | null | undefined,
): boolean {
  return sourceType === "EXTERNAL_STUDIO" || sourceType === "CUSTOMER" || sourceType === "FACTORY";
}
