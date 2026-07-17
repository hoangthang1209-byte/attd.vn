import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  mapMatrixCombinationCreateError,
  MATRIX_FK_LINK_ERROR,
  MATRIX_MISSING_RECORD_ERROR,
  MATRIX_OPTION_VALUE_OWNERSHIP_ERROR,
  MATRIX_SKU_CONFLICT_RETRY_MESSAGE,
  MATRIX_TRANSACTION_TIMEOUT_ERROR,
  MATRIX_TX_SERIALIZATION_ERROR,
  MATRIX_UNKNOWN_CREATE_DIAGNOSTIC,
  MATRIX_UNKNOWN_CREATE_ERROR,
  MATRIX_VALIDATION_CREATE_ERROR,
  isSkuUniqueConstraintError,
} from "@/features/products/product-variant-matrix.service";

const combo = {
  displayLabel: "Navy / XS",
  valueIds: ["opt-navy", "opt-xs"],
};

describe("mapMatrixCombinationCreateError", () => {
  it("maps Prisma P2002 sku conflicts to retry-oriented Vietnamese message", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.9.0",
      meta: { target: ["sku"] },
    });
    assert.equal(
      mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS"),
      MATRIX_SKU_CONFLICT_RETRY_MESSAGE("PRRE0003-NVY-XS"),
    );
  });

  it("maps duck-typed P2002 without Prisma instanceof to SKU conflict", () => {
    const error = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["ProductVariant_sku_key"] },
      name: "PrismaClientKnownRequestError",
    });
    assert.equal(isSkuUniqueConstraintError(error), true);
    assert.equal(
      mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS"),
      MATRIX_SKU_CONFLICT_RETRY_MESSAGE("PRRE0003-NVY-XS"),
    );
  });

  it("maps Prisma P2003 foreign key failures to distinct link error", () => {
    const error = new Prisma.PrismaClientKnownRequestError("FK failed", {
      code: "P2003",
      clientVersion: "6.9.0",
      meta: { field_name: "optionValueId" },
    });
    assert.equal(
      mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS"),
      MATRIX_FK_LINK_ERROR,
    );
    assert.notEqual(MATRIX_FK_LINK_ERROR, MATRIX_OPTION_VALUE_OWNERSHIP_ERROR);
  });

  it("maps Prisma P2025 to reload guidance", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "6.9.0",
    });
    assert.equal(
      mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS"),
      MATRIX_MISSING_RECORD_ERROR,
    );
  });

  it("maps interactive transaction timeout to precise Vietnamese message", () => {
    const error = new Error(
      "Transaction API error: Transaction already closed: The timeout for this transaction was 5000 ms.",
    );
    assert.equal(
      mapMatrixCombinationCreateError(error, combo, "PRRE0004-BLK-XL"),
      MATRIX_TRANSACTION_TIMEOUT_ERROR,
    );
  });

  it("maps P2028 and P2034 to precise transaction messages", () => {
    const timeout = new Prisma.PrismaClientKnownRequestError("txn timeout", {
      code: "P2028",
      clientVersion: "6.9.0",
    });
    assert.equal(
      mapMatrixCombinationCreateError(timeout, combo, "SKU-1"),
      MATRIX_TRANSACTION_TIMEOUT_ERROR,
    );

    const serialization = new Prisma.PrismaClientKnownRequestError("write conflict", {
      code: "P2034",
      clientVersion: "6.9.0",
    });
    assert.equal(
      mapMatrixCombinationCreateError(serialization, combo, "SKU-1"),
      MATRIX_TX_SERIALIZATION_ERROR,
    );
  });

  it("maps Prisma validation errors to distinct validation message", () => {
    const error = new Prisma.PrismaClientValidationError("Invalid `prisma.productVariant.create()`", {
      clientVersion: "6.9.0",
    });
    const message = mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS");
    assert.equal(message, MATRIX_VALIDATION_CREATE_ERROR);
    assert.doesNotMatch(message, /Giá trị tuỳ chọn không tồn tại/);
  });

  it("maps unknown errors to diagnostic code and logs details", () => {
    const message = mapMatrixCombinationCreateError(new Error("unexpected"), combo, "SKU-1");
    assert.equal(message, MATRIX_UNKNOWN_CREATE_ERROR);
    assert.match(message, new RegExp(MATRIX_UNKNOWN_CREATE_DIAGNOSTIC));
    assert.doesNotMatch(message, /Giá trị tuỳ chọn không tồn tại/);
  });

  it("rethrows ProductAdminValidationError unchanged", () => {
    const error = new ProductAdminValidationError(MATRIX_OPTION_VALUE_OWNERSHIP_ERROR, {
      variants: "stale",
    });
    assert.throws(
      () => mapMatrixCombinationCreateError(error, combo, "SKU-1"),
      (err: unknown) => err instanceof ProductAdminValidationError,
    );
  });
});
