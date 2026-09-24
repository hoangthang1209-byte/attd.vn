import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { copyQuoteNumber } from "./quote-number-clipboard";

describe("quote number clipboard", () => {
  it("copies the exact quote number", async () => {
    const writes: string[] = [];

    const copied = await copyQuoteNumber("BG-000123", {
      async writeText(text) {
        writes.push(text);
      },
    });

    assert.equal(copied, true);
    assert.deepEqual(writes, ["BG-000123"]);
  });

  it("returns a graceful failure when clipboard access is unavailable or rejected", async () => {
    assert.equal(await copyQuoteNumber("BG-000123", undefined), false);
    assert.equal(
      await copyQuoteNumber("BG-000123", {
        async writeText() {
          throw new Error("Clipboard denied");
        },
      }),
      false,
    );
  });

  it("connects temporary Vietnamese feedback to the quote detail control", () => {
    const source = readFileSync(
      "src/components/admin/quotes/QuoteDetailView.tsx",
      "utf8",
    );

    assert.match(source, /copyQuoteNumber\(quote\.quoteNo\)/);
    assert.match(source, /Đã sao chép/);
    assert.match(source, /Không thể sao chép/);
    assert.match(source, /setTimeout\(\(\) => \{/);
    assert.match(source, /aria-live="polite"/);
  });
});
