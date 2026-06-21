import { Prisma } from "@prisma/client";

export class MaterialValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterialValidationError";
  }
}

export function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function decimalToString(value: Prisma.Decimal | number | string): string {
  return new Prisma.Decimal(value).toFixed();
}

export function computeAvailableQuantity(
  onHand: Prisma.Decimal,
  reserved: Prisma.Decimal,
): Prisma.Decimal {
  const available = onHand.sub(reserved);
  return available.lt(0) ? new Prisma.Decimal(0) : available;
}

export function assertNonNegative(value: Prisma.Decimal, label: string) {
  if (value.lt(0)) {
    throw new MaterialValidationError(`${label} không được âm.`);
  }
}

export function maxDecimal(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.gte(b) ? a : b;
}

export function minDecimal(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.lte(b) ? a : b;
}
