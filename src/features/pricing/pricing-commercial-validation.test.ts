import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertTaxableBaseNonNegative,
  assertVatRateInRange,
  marginRateWhenCostKnown,
  validatePricingCalculatorCommercialInput,
} from "@/features/pricing/pricing-commercial-validation";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";

describe("pricing commercial validation", () => {
  it("rejects VAT out of range", () => {
    assert.throws(() => assertVatRateInRange(101), PricingValidationError);
  });

  it("rejects negative discount making taxable base negative", () => {
    assert.throws(
      () => assertTaxableBaseNonNegative(100, 150, 0),
      PricingValidationError,
    );
  });

  it("returns 100% margin when cost is zero but revenue is positive", () => {
    assert.equal(
      marginRateWhenCostKnown({ lineTotal: 1000, totalCost: 0, marginAmount: 1000 }),
      100,
    );
  });

  it("validates calculator monetary fields", () => {
    assert.throws(
      () => validatePricingCalculatorCommercialInput({ discountAmount: -1, items: [] }),
      PricingValidationError,
    );
  });
});
