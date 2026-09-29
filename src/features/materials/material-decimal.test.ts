import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertReturnDoesNotExceedIssued,
  MaterialValidationError,
  toDecimal,
} from "./material-decimal";

describe("material stock invariants", () => {
  it("allows returning up to the issued quantity", () => {
    assert.doesNotThrow(() =>
      assertReturnDoesNotExceedIssued(toDecimal("10"), toDecimal("10")),
    );
    assert.doesNotThrow(() =>
      assertReturnDoesNotExceedIssued(toDecimal("2.5"), toDecimal("10")),
    );
  });

  it("rejects returning more than was issued", () => {
    assert.throws(
      () => assertReturnDoesNotExceedIssued(toDecimal("10.001"), toDecimal("10")),
      (error) =>
        error instanceof MaterialValidationError &&
        error.message === "Số lượng trả không được vượt số lượng đã cấp cho sản xuất.",
    );
  });
});
