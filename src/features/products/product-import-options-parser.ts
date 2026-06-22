export type ParsedOptionPair = { group: string; value: string };

/**
 * Parse structured option combination strings such as:
 * `Màu sắc=Đen | Kích thước=M | Chất liệu=Cotton 250gsm`
 */
export function parseStructuredOptionValues(input: string): ParsedOptionPair[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const parts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);
  const pairs: ParsedOptionPair[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const group = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (group && value) pairs.push({ group, value });
  }

  return pairs;
}

export function hasStructuredAndLegacyConflict(
  optionPairs: ParsedOptionPair[],
  legacy: { colorName?: string; sizeName?: string },
): boolean {
  const hasStructured = optionPairs.length > 0;
  const hasLegacy = Boolean(legacy.colorName?.trim() || legacy.sizeName?.trim());
  return hasStructured && hasLegacy;
}

export function buildDisplayLabelFromOptions(pairs: ParsedOptionPair[]): string {
  return pairs.map((p) => p.value).join(" / ");
}

export function normalizeOptionComboSignature(pairs: ParsedOptionPair[]): string {
  return pairs
    .map((p) => `${p.group.trim().toLowerCase()}=${p.value.trim().toLowerCase()}`)
    .sort()
    .join("|");
}
