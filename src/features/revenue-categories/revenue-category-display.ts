export function getRevenueCategoryDisplay(input: {
  nameSnapshot?: string | null;
  codeSnapshot?: string | null;
  name?: string | null;
  path?: string | null;
}): string {
  if (input.path?.trim()) return input.path.trim();
  if (input.nameSnapshot?.trim()) return input.nameSnapshot.trim();
  if (input.name?.trim()) return input.name.trim();
  if (input.codeSnapshot?.trim()) return input.codeSnapshot.trim();
  return "Chưa phân loại";
}

export function buildRevenueCategoryPath(
  category: { name: string },
  ancestors: Array<{ name: string }>,
): string {
  return [...ancestors.map((a) => a.name), category.name].join(" > ");
}

export function normalizeRevenueCategoryLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
