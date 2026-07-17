import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  mapMatrixCombinationCreateError,
  MATRIX_OPTION_VALUE_OWNERSHIP_ERROR,
} from "@/features/products/product-variant-matrix.service";

const combo = {
  displayLabel: "Navy / XS",
  valueIds: ["opt-navy", "opt-xs"],
};

describe("mapMatrixCombinationCreateError", () => {
  it("maps Prisma P2002 sku conflicts to actionable Vietnamese message", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.9.0",
      meta: { target: ["sku"] },
    });
    assert.equal(
      mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS"),
      'SKU "PRRE0003-NVY-XS" đã tồn tại.',
    );
  });

  it("maps Prisma P2003 foreign key failures to ownership message", () => {
    const error = new Prisma.PrismaClientKnownRequestError("FK failed", {
      code: "P2003",
      clientVersion: "6.9.0",
      meta: { field_name: "optionValueId" },
    });
    assert.equal(mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS"), MATRIX_OPTION_VALUE_OWNERSHIP_ERROR);
    assert.match(MATRIX_OPTION_VALUE_OWNERSHIP_ERROR, /Vui lòng lưu sản phẩm rồi thử lại/);
  });

  it("maps Prisma validation errors to ownership message instead of generic invalid combo", () => {
    const error = new Prisma.PrismaClientValidationError("Invalid `prisma.productVariant.create()`", {
      clientVersion: "6.9.0",
    });
    const message = mapMatrixCombinationCreateError(error, combo, "PRRE0003-NVY-XS");
    assert.equal(message, MATRIX_OPTION_VALUE_OWNERSHIP_ERROR);
    assert.doesNotMatch(message, /Dữ liệu tổ hợp không hợp lệ/);
  });

  it("never returns the legacy generic combo invalid message", () => {
    const message = mapMatrixCombinationCreateError(new Error("unexpected"), combo, "SKU-1");
    assert.equal(message, MATRIX_OPTION_VALUE_OWNERSHIP_ERROR);
    assert.doesNotMatch(message, /Dữ liệu tổ hợp không hợp lệ/);
  });

  it("rethrows ProductAdminValidationError unchanged", () => {
    const error = new ProductAdminValidationError("Giá trị tuỳ chọn không tồn tại hoặc không thuộc sản phẩm này. Vui lòng lưu sản phẩm rồi thử lại.", {
      variants: "stale",
    });
    assert.throws(
      () => mapMatrixCombinationCreateError(error, combo, "SKU-1"),
      (err: unknown) => err instanceof ProductAdminValidationError,
    );
  });
});
