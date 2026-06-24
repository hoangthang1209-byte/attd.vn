import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatProductAdminApiError,
  isPrismaTransactionTimeoutError,
  PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE,
} from "@/features/products/product-admin-input";

describe("product save transaction timeout handling", () => {
  it("detects Prisma interactive transaction timeout messages", () => {
    assert.equal(
      isPrismaTransactionTimeoutError(
        new Error(
          "Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction.",
        ),
      ),
      true,
    );
    assert.equal(isPrismaTransactionTimeoutError(new Error("Unique constraint failed")), false);
  });

  it("maps timeout errors to the Vietnamese staff message", () => {
    const formatted = formatProductAdminApiError(
      new Error(
        "Transaction API error: Transaction already closed: The timeout for this transaction was 5000 ms.",
      ),
    );
    assert.equal(formatted.error, PRODUCT_SAVE_TRANSACTION_TIMEOUT_MESSAGE);
    assert.equal(formatted.status, 503);
  });
});
