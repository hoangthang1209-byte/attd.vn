import { PricingValidationError } from "@/features/pricing/services/price-group.service";

export function assertNonNegativeMoney(value: number | undefined | null, label: string): void {
  if (value == null) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new PricingValidationError(`${label} phải >= 0.`);
  }
}

export function assertVatRateInRange(vatRate: number | undefined | null): number {
  const rate = vatRate ?? 0;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new PricingValidationError("Thuế VAT phải từ 0% đến 100%.");
  }
  return rate;
}

export function assertTaxableBaseNonNegative(subtotal: number, discountAmount: number, shippingFee: number): void {
  const taxableBase = subtotal - discountAmount + shippingFee;
  if (taxableBase < 0) {
    throw new PricingValidationError(
      "Tổng chịu thuế không hợp lệ: chiết khấu/vận chuyển làm giá trị thương mại âm.",
    );
  }
}

export function validatePricingCalculatorCommercialInput(input: {
  discountAmount?: number;
  shippingFee?: number;
  vatRate?: number;
  manualTotalAmount?: number;
  items?: Array<{ discountAmount?: number; manualUnitPrice?: number }>;
}): void {
  assertNonNegativeMoney(input.discountAmount, "Chiết khấu");
  assertNonNegativeMoney(input.shippingFee, "Phí vận chuyển");
  assertNonNegativeMoney(input.manualTotalAmount, "Tổng chỉnh tay");
  assertVatRateInRange(input.vatRate);
  for (const item of input.items ?? []) {
    assertNonNegativeMoney(item.discountAmount, "Chiết khấu dòng");
    assertNonNegativeMoney(item.manualUnitPrice, "Đơn giá chỉnh tay");
  }
}

export function validateCostingCommercialInput(input: {
  vatRate?: number;
  targetMarginRate?: number;
  overheadRate?: number;
}): void {
  assertVatRateInRange(input.vatRate);
  const margin = input.targetMarginRate ?? 0;
  if (!Number.isFinite(margin) || margin < 0 || margin >= 100) {
    throw new PricingValidationError("Biên lợi nhuận mục tiêu phải từ 0% đến dưới 100%.");
  }
  const overhead = input.overheadRate ?? 0;
  if (!Number.isFinite(overhead) || overhead < 0 || overhead >= 100) {
    throw new PricingValidationError("Tỷ lệ overhead phải từ 0% đến dưới 100%.");
  }
}

export function marginRateWhenCostKnown(params: {
  lineTotal: number;
  totalCost: number;
  marginAmount: number;
}): number | null {
  if (params.lineTotal <= 0) return null;
  if (params.totalCost > 0) {
    return Math.round((params.marginAmount / params.lineTotal) * 10000) / 100;
  }
  return 100;
}
