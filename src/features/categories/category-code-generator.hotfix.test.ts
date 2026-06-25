import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateCategoryCodeCandidates,
  generateCategoryCodeFromEnglishName,
  generateUniqueCategoryCodeFromEnglishName,
} from "./category-code-generator";
import { FOUR_LETTER_CATEGORY_CODE_REGEX } from "./category-admin-constants";
import {
  shouldGenerateCategoryCodeOnSave,
  shouldIgnoreClientCategoryCode,
} from "./category-admin-code-policy";

describe("category-code-generator hotfix", () => {
  it("never returns codes with digits", () => {
    for (const name of ["T-Shirt", "T-Shirts", "Tee", "Polo Shirts", "Tote Bags"]) {
      for (const code of generateCategoryCodeCandidates(name)) {
        assert.match(code, FOUR_LETTER_CATEGORY_CODE_REGEX);
        assert.doesNotMatch(code, /\d/);
      }
    }
  });

  it("generates exactly 4 letters for T-Shirt and Tee", () => {
    assert.match(generateCategoryCodeFromEnglishName("T-Shirt"), FOUR_LETTER_CATEGORY_CODE_REGEX);
    assert.match(generateCategoryCodeFromEnglishName("T-Shirts"), FOUR_LETTER_CATEGORY_CODE_REGEX);
    assert.match(generateCategoryCodeFromEnglishName("Tee"), FOUR_LETTER_CATEGORY_CODE_REGEX);
    assert.notEqual(generateCategoryCodeFromEnglishName("T-Shirt"), "TEE");
  });

  it("resolves collisions with letters-only alternatives", async () => {
    const taken = new Set(["TSHI"]);
    const code = await generateUniqueCategoryCodeFromEnglishName("T-Shirts", (candidate) =>
      taken.has(candidate),
    );
    assert.match(code, FOUR_LETTER_CATEGORY_CODE_REGEX);
    assert.notEqual(code, "TSHI");
    assert.doesNotMatch(code, /\d/);
  });
});

describe("category-admin-code-policy", () => {
  it("always generates on create and only regenerates on explicit flag", () => {
    assert.equal(shouldGenerateCategoryCodeOnSave({ isCreate: true }), true);
    assert.equal(shouldGenerateCategoryCodeOnSave({ isCreate: false }), false);
    assert.equal(
      shouldGenerateCategoryCodeOnSave({ isCreate: false, regenerateCode: true }),
      true,
    );
  });

  it("ignores client submitted codes on create and regenerate", () => {
    assert.equal(
      shouldIgnoreClientCategoryCode({ isCreate: true, clientSkuCode: "ABCD" }),
      true,
    );
    assert.equal(
      shouldIgnoreClientCategoryCode({ isCreate: false, regenerateCode: true, clientSkuCode: "ABCD" }),
      true,
    );
    assert.equal(
      shouldIgnoreClientCategoryCode({ isCreate: false, clientSkuCode: "ABCD" }),
      true,
    );
  });
});
