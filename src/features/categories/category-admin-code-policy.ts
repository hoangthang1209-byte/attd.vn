export function shouldGenerateCategoryCodeOnSave(input: {
  isCreate: boolean;
  regenerateCode?: boolean;
}): boolean {
  return input.isCreate || Boolean(input.regenerateCode);
}

export function shouldIgnoreClientCategoryCode(input: {
  isCreate: boolean;
  regenerateCode?: boolean;
  clientSkuCode?: string | null;
}): boolean {
  if (input.isCreate) return true;
  if (input.regenerateCode) return true;
  return Boolean(input.clientSkuCode?.trim());
}
