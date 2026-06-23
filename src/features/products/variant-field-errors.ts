import type { MatrixVariantFormRow } from "@/features/products/product-catalog-form-mappers";

export type VariantFieldRef = {
  id?: string;
  clientKey: string;
};

export type VariantRowError = {
  variantId?: string;
  clientKey: string;
  variantLabel: string;
  field: string;
  fieldKey: string;
  message: string;
};

export function variantErrorPrefix(ref: VariantFieldRef): string {
  if (ref.id) return `variants.byId.${ref.id}`;
  return `variants.byClientKey.${ref.clientKey}`;
}

export function variantFieldKey(ref: VariantFieldRef, field: string): string {
  return `${variantErrorPrefix(ref)}.${field}`;
}

export function variantRefFromRow(variant: MatrixVariantFormRow): VariantFieldRef {
  return { id: variant.id, clientKey: variant.clientKey };
}

export function getVariantFieldError(
  fieldErrors: Record<string, string>,
  ref: VariantFieldRef,
  field: string,
  variantIndex?: number,
): string | undefined {
  const stableKey = variantFieldKey(ref, field);
  if (fieldErrors[stableKey]) return fieldErrors[stableKey];
  if (variantIndex !== undefined && variantIndex >= 0) {
    return fieldErrors[`variants.${variantIndex}.${field}`];
  }
  return undefined;
}

export function variantRowHasError(
  fieldErrors: Record<string, string>,
  ref: VariantFieldRef,
  variantIndex?: number,
): boolean {
  const prefix = variantErrorPrefix(ref);
  if (Object.keys(fieldErrors).some((key) => key.startsWith(`${prefix}.`))) return true;
  if (variantIndex !== undefined && variantIndex >= 0) {
    return Object.keys(fieldErrors).some((key) => key.startsWith(`variants.${variantIndex}.`));
  }
  return false;
}

export function parseVariantFieldKey(
  fieldKey: string,
): { kind: "byId" | "byClientKey" | "index"; id?: string; clientKey?: string; index?: number; field: string } | null {
  const byId = /^variants\.byId\.([^.]+)\.(.+)$/.exec(fieldKey);
  if (byId) return { kind: "byId", id: byId[1], field: byId[2] };

  const byClientKey = /^variants\.byClientKey\.([^.]+)\.(.+)$/.exec(fieldKey);
  if (byClientKey) return { kind: "byClientKey", clientKey: byClientKey[1], field: byClientKey[2] };

  const byIndex = /^variants\.(\d+)\.(.+)$/.exec(fieldKey);
  if (byIndex) return { kind: "index", index: Number(byIndex[1]), field: byIndex[2] };

  if (fieldKey === "variants") return { kind: "index", field: "variants" };
  return null;
}

export function findVariantForFieldKey(
  fieldKey: string,
  variants: MatrixVariantFormRow[],
): { variant: MatrixVariantFormRow; index: number } | null {
  const parsed = parseVariantFieldKey(fieldKey);
  if (!parsed) return null;

  if (parsed.kind === "byId" && parsed.id) {
    const index = variants.findIndex((row) => row.id === parsed.id);
    if (index >= 0) return { variant: variants[index], index };
  }
  if (parsed.kind === "byClientKey" && parsed.clientKey) {
    const index = variants.findIndex((row) => row.clientKey === parsed.clientKey);
    if (index >= 0) return { variant: variants[index], index };
  }
  if (parsed.kind === "index" && parsed.index !== undefined) {
    const variant = variants[parsed.index];
    if (variant) return { variant, index: parsed.index };
  }
  return null;
}

export function buildVariantRowErrors(
  fieldErrors: Record<string, string>,
  variants: MatrixVariantFormRow[],
): VariantRowError[] {
  const rows: VariantRowError[] = [];
  const seen = new Set<string>();

  for (const [fieldKey, message] of Object.entries(fieldErrors)) {
    if (!fieldKey.startsWith("variants.")) continue;
    if (seen.has(fieldKey)) continue;
    seen.add(fieldKey);

    const located = findVariantForFieldKey(fieldKey, variants);
    const parsed = parseVariantFieldKey(fieldKey);
    const field = parsed?.field ?? fieldKey;

    if (located) {
      rows.push({
        variantId: located.variant.id,
        clientKey: located.variant.clientKey,
        variantLabel: located.variant.displayLabel || located.variant.sku || `Biến thể ${located.index + 1}`,
        field,
        fieldKey,
        message,
      });
      continue;
    }

    if (fieldKey === "variants") {
      rows.push({
        clientKey: "",
        variantLabel: "Biến thể",
        field: "variants",
        fieldKey,
        message,
      });
    }
  }

  return rows;
}

export function focusVariantField(fieldKey: string): void {
  const el =
    document.querySelector<HTMLElement>(`[data-field="${fieldKey}"]`) ??
    document.querySelector<HTMLElement>(`[data-field-prefix="${fieldKey.split(".").slice(0, -1).join(".")}"]`);

  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = el.matches("input,select,textarea,button")
    ? el
    : el.querySelector<HTMLElement>("input,select,textarea,button");
  focusable?.focus({ preventScroll: true });
}

const FIELD_LABELS: Record<string, string> = {
  sku: "SKU",
  stockQty: "Tồn kho",
  moqOverride: "MOQ",
  leadTimeOverride: "Lead time",
  wholesalePrice: "Giá sỉ",
  dealerPrice: "Giá đại lý",
  costPrice: "Giá vốn",
  imageUrl: "Ảnh",
  optionValueIds: "Thuộc tính",
};

export function variantFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}
