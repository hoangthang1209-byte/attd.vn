import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateCategoryCodeCandidates,
  generateCategoryCodeFromEnglishName,
  generateUniqueCategoryCodeFromEnglishName,
} from "./category-code-generator";
import { FOUR_LETTER_CATEGORY_CODE_REGEX } from "./category-admin-constants";

describe("category-code-generator", () => {
  it("generates first-four letters for one-word names", () => {
    assert.equal(generateCategoryCodeFromEnglishName("TUMBLER"), "TUMB");
    assert.equal(generateCategoryCodeFromEnglishName("T-Shirts"), "TSHI");
  });

  it("generates mnemonic codes for multi-word names", () => {
    assert.equal(generateCategoryCodeFromEnglishName("Polo Shirts"), "POLS");
    assert.equal(generateCategoryCodeFromEnglishName("Regular Fit"), "REGF");
    assert.equal(generateCategoryCodeFromEnglishName("Sports Polo"), "SPOL");
    assert.equal(generateCategoryCodeFromEnglishName("Canvas Tote"), "CATO");
  });

  it("returns only 4 uppercase alphabetic characters", () => {
    for (const name of ["Polo Shirts", "Gift Set", "OEM Private Label"]) {
      const code = generateCategoryCodeFromEnglishName(name);
      assert.match(code, FOUR_LETTER_CATEGORY_CODE_REGEX);
    }
  });

  it("picks deterministic collision alternatives without digits", async () => {
    const taken = new Set(["POLS"]);
    const code = await generateUniqueCategoryCodeFromEnglishName("Polo Shirts", (candidate) =>
      taken.has(candidate),
    );
    assert.match(code, FOUR_LETTER_CATEGORY_CODE_REGEX);
    assert.notEqual(code, "POLS");
    assert.doesNotMatch(code, /\d/);
  });

  it("throws when no unique candidate can be generated", async () => {
    const candidates = generateCategoryCodeCandidates("Polo Shirts");
    const taken = new Set(candidates);
    await assert.rejects(
      () =>
        generateUniqueCategoryCodeFromEnglishName("Polo Shirts", (code) => taken.has(code)),
      /Không thể tự tạo mã/,
    );
  });
});
