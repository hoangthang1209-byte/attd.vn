import { getColorSkuCode, normalizeSkuPart } from "@/features/products/product-sku-utils";
import { isColorOptionGroup, normalizeOptionName } from "@/features/products/product-variant-matrix.utils";

const SIZE_LABEL_CODES: Record<string, string> = {
  xs: "XS",
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
  xxl: "XXL",
  "2xl": "XXL",
  "3xl": "3XL",
  "4xl": "4XL",
  "5xl": "5XL",
};

const GROUP_SLUG_HINTS: Record<string, string> = {
  "mau sac": "color",
  "mau": "color",
  color: "color",
  "kich thuoc": "size",
  size: "size",
};

/** Internal slug for option group from display name. */
export function generateOptionGroupSlug(name: string): string {
  const normalized = normalizeOptionName(name);
  for (const [hint, slug] of Object.entries(GROUP_SLUG_HINTS)) {
    if (normalized.includes(hint)) return slug;
  }
  return normalizeSkuPart(name).toLowerCase().slice(0, 24) || "option";
}

/** Suggest managed group code prefix (COLOR, SIZE, …). */
export function suggestOptionGroupCode(name: string, slug?: string): string {
  const group = { name, slug: slug ?? "" };
  if (isColorOptionGroup(group)) return "COLOR";
  const normalized = normalizeOptionName(name);
  if (normalized.includes("kich thuoc") || normalized.includes("size")) return "SIZE";
  return normalizeSkuPart(name).slice(0, 8) || "OPT";
}

function normalizeSizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

/** Auto-generate a stable value code from display label within a group. */
export function generateOptionValueCode(
  group: { name: string; slug: string },
  label: string,
  existingCodes: string[] = [],
): string {
  const trimmed = label.trim();
  if (!trimmed) return "";

  let candidate = "";
  if (isColorOptionGroup(group)) {
    candidate = getColorSkuCode(trimmed);
  } else if (
    group.slug.toLowerCase().includes("size") ||
    normalizeOptionName(group.name).includes("kich thuoc")
  ) {
    const sizeKey = normalizeSizeLabel(trimmed);
    candidate = SIZE_LABEL_CODES[sizeKey] ?? normalizeSkuPart(trimmed).slice(0, 6);
  } else {
    candidate = normalizeSkuPart(trimmed).slice(0, 8);
  }

  if (!candidate) candidate = "VAL";

  const used = new Set(existingCodes.map((c) => c.toUpperCase()));
  if (!used.has(candidate.toUpperCase())) return candidate;

  for (let i = 2; i <= 99; i++) {
    const next = `${candidate}${i}`;
    if (!used.has(next.toUpperCase())) return next;
  }
  return `${candidate}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export function validateOptionValueCodesInGroup(
  groupIndex: number,
  groupName: string,
  values: Array<{ label: string; valueCode: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const seenCodes = new Set<string>();
  const seenLabels = new Set<string>();

  values.forEach((value, valueIndex) => {
    const label = value.label.trim();
    if (!label) {
      errors[`options.${groupIndex}.values.${valueIndex}.label`] =
        `Giá trị trong nhóm "${groupName}" không được để trống.`;
      return;
    }
    const labelKey = normalizeOptionName(label);
    if (seenLabels.has(labelKey)) {
      errors[`options.${groupIndex}.values.${valueIndex}.label`] =
        `Giá trị "${label}" bị trùng trong nhóm "${groupName}".`;
    }
    seenLabels.add(labelKey);

    const code = value.valueCode.trim();
    if (code) {
      const codeKey = code.toUpperCase();
      if (seenCodes.has(codeKey)) {
        errors[`options.${groupIndex}.values.${valueIndex}.valueCode`] =
          `Mã "${code}" bị trùng trong nhóm "${groupName}".`;
      }
      seenCodes.add(codeKey);
    }
  });

  return errors;
}
