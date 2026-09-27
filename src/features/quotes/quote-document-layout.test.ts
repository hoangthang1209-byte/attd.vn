import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCompactQuoteDocument } from "./quote-document-layout";
import { quotePdfFilename } from "./pdf/quote-pdf-filename";

describe("quote document presentation", () => {
  it("uses the compact layout for a short quote without design images", () => {
    assert.equal(isCompactQuoteDocument({ items: [{ designImageUrl: null }] }), true);
    assert.equal(isCompactQuoteDocument({ items: [{ designImageUrl: "https://example.com/design.png" }] }), false);
    assert.equal(isCompactQuoteDocument({ items: Array.from({ length: 4 }, () => ({ designImageUrl: null })) }), false);
  });

  it("names the customer-facing PDF using the quote number and customer", () => {
    assert.equal(quotePdfFilename("BG-000004", "Công ty Đặng Gia"), "Bao-gia-ATTD-BG-000004-Cong-ty-Dang-Gia.pdf");
    assert.equal(quotePdfFilename("BG-000004"), "Bao-gia-ATTD-BG-000004.pdf");
  });
});
