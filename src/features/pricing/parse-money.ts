export function parseMoneyInput(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/[,\s]/g, "");
  if (!trimmed) return null;
  const num = parseFloat(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function parseOptionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value !== "string") return null;
  const num = parseInt(value.trim(), 10);
  return Number.isInteger(num) ? num : null;
}

export function parseRequiredInt(value: unknown, fallback = 0): number {
  const parsed = parseOptionalInt(value);
  return parsed ?? fallback;
}
