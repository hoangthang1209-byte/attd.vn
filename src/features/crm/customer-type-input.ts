export type CreateCustomerTypeInput = {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateCustomerTypeInput = {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export function normalizeCustomerTypeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}
