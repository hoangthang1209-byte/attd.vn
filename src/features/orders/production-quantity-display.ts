/** Browser-safe quantity formatting — no Prisma/Node dependencies. */

type QuantityLike =
  | number
  | string
  | null
  | undefined
  | { toNumber(): number };

function toQuantityNumber(value: QuantityLike): number {
  if (value == null) return 0;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatQuantityDisplay(value: QuantityLike): string {
  const n = toQuantityNumber(value);
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
}

export function decimalToNumber(value: QuantityLike): number {
  return toQuantityNumber(value);
}
