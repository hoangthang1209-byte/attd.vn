import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBatchQuoteFingerprintPayload,
  computeBatchQuoteFingerprint,
  isBatchChangedSinceQuote,
  type BatchQuoteFingerprintInput,
} from "@/features/pricing/costing-batch-quote-fingerprint";
import { formatPricingCurrency } from "@/features/pricing/format";
import { parseSellingPrice } from "@/features/pricing/costing-batch-spreadsheet";
import { readFileSync } from "node:fs";
import path from "node:path";

function baseInput(overrides?: Partial<BatchQuoteFingerprintInput>): BatchQuoteFingerprintInput {
  return {
    customerId: "cust-1",
    contactId: "contact-1",
    rows: [
      {
        itemId: "item-a",
        calculationId: "calc-a",
        productId: null,
        customProductName: "Sleeveless Top",
        quantity: 200,
        sellingPricePerUnit: 164000,
        costEstimate: 5600000,
        revisionLabel: "V1",
        isFinal: true,
      },
      {
        itemId: "item-b",
        calculationId: "calc-b",
        productId: null,
        customProductName: "Tank top",
        quantity: 200,
        sellingPricePerUnit: 40000,
        costEstimate: 5600000,
        revisionLabel: "V1",
        isFinal: true,
      },
    ],
    ...overrides,
  };
}

describe("costing batch quote fingerprint", () => {
  it("4. identical commercial state yields same fingerprint", () => {
    const a = computeBatchQuoteFingerprint(baseInput());
    const b = computeBatchQuoteFingerprint(baseInput());
    assert.equal(a, b);
    assert.equal(isBatchChangedSinceQuote(a, a), false);
  });

  it("5. quantity change marks dirty", () => {
    const quoted = computeBatchQuoteFingerprint(baseInput());
    const next = computeBatchQuoteFingerprint(
      baseInput({
        rows: baseInput().rows.map((row) =>
          row.itemId === "item-a" ? { ...row, quantity: 250 } : row,
        ),
      }),
    );
    assert.equal(isBatchChangedSinceQuote(next, quoted), true);
  });

  it("6. selling price change marks dirty", () => {
    const quoted = computeBatchQuoteFingerprint(baseInput());
    const next = computeBatchQuoteFingerprint(
      baseInput({
        rows: baseInput().rows.map((row) =>
          row.itemId === "item-a" ? { ...row, sellingPricePerUnit: 168000 } : row,
        ),
      }),
    );
    assert.equal(isBatchChangedSinceQuote(next, quoted), true);
  });

  it("7. style add/remove marks dirty", () => {
    const quoted = computeBatchQuoteFingerprint(baseInput());
    const added = computeBatchQuoteFingerprint(
      baseInput({
        rows: [
          ...baseInput().rows,
          {
            itemId: "item-c",
            calculationId: "calc-c",
            productId: null,
            customProductName: "Hoodie",
            quantity: 100,
            sellingPricePerUnit: 200000,
            costEstimate: 8000000,
            revisionLabel: "V1",
            isFinal: false,
          },
        ],
      }),
    );
    const removed = computeBatchQuoteFingerprint(
      baseInput({ rows: baseInput().rows.slice(0, 1) }),
    );
    assert.equal(isBatchChangedSinceQuote(added, quoted), true);
    assert.equal(isBatchChangedSinceQuote(removed, quoted), true);
  });

  it("8. calculation revision change marks dirty", () => {
    const quoted = computeBatchQuoteFingerprint(baseInput());
    const next = computeBatchQuoteFingerprint(
      baseInput({
        rows: baseInput().rows.map((row) =>
          row.itemId === "item-a"
            ? { ...row, calculationId: "calc-a-v2", revisionLabel: "V2", costEstimate: 6200000 }
            : row,
        ),
      }),
    );
    assert.equal(isBatchChangedSinceQuote(next, quoted), true);
  });

  it("9. customer/contact change marks dirty", () => {
    const quoted = computeBatchQuoteFingerprint(baseInput());
    const nextCustomer = computeBatchQuoteFingerprint(baseInput({ customerId: "cust-2" }));
    const nextContact = computeBatchQuoteFingerprint(baseInput({ contactId: "contact-2" }));
    assert.equal(isBatchChangedSinceQuote(nextCustomer, quoted), true);
    assert.equal(isBatchChangedSinceQuote(nextContact, quoted), true);
  });

  it("10. groupLabel-only change does NOT mark dirty", () => {
    const quoted = computeBatchQuoteFingerprint(baseInput());
    // groupLabel is intentionally absent from fingerprint payload.
    const payload = buildBatchQuoteFingerprintPayload(baseInput());
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload.rows[0], "groupLabel"),
      false,
    );
    assert.equal(isBatchChangedSinceQuote(quoted, quoted), false);
  });

  it("custom style without productId is fingerprintable", () => {
    const fp = computeBatchQuoteFingerprint(
      baseInput({
        rows: [
          {
            itemId: "custom-1",
            calculationId: "calc-x",
            productId: null,
            customProductName: "Áo custom",
            quantity: 50,
            sellingPricePerUnit: 99000,
            costEstimate: 1000000,
            revisionLabel: null,
            isFinal: false,
          },
        ],
      }),
    );
    assert.equal(typeof fp, "string");
    assert.equal(fp.length, 64);
  });
});

describe("selling price display formatting", () => {
  it("24. display uses same VND format as adjacent money columns", () => {
    assert.equal(formatPricingCurrency(164000), "164.000 đ");
    assert.equal(formatPricingCurrency(28000), "28.000 đ");
  });

  it("25. edit parse remains keyboard-friendly for raw and dotted input", () => {
    assert.equal(parseSellingPrice("164000"), 164000);
    assert.equal(parseSellingPrice("164.000"), 164000);
    // Display uses formatPricingCurrency; edit state keeps raw numeric string.
    assert.equal(formatPricingCurrency(164000), "164.000 đ");
  });
});

describe("batch quote revision wiring", () => {
  const root = process.cwd();
  const service = readFileSync(
    path.join(root, "src/features/pricing/services/costing-batch.service.ts"),
    "utf8",
  );
  const workspace = readFileSync(
    path.join(root, "src/components/admin/pricing/CostingBatchWorkspace.tsx"),
    "utf8",
  );
  const quoteService = readFileSync(
    path.join(root, "src/features/quotes/quote.service.ts"),
    "utf8",
  );
  const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    path.join(root, "prisma/migrations/0094_costing_batch_quote_revisions/migration.sql"),
    "utf8",
  );

  it("1–3. create quote path no longer hard-blocks on existing quoteId", () => {
    assert.doesNotMatch(
      service,
      /Batch đã có báo giá\. Tạo báo giá mới từ batch đã quoted không được phép/,
    );
    assert.match(service, /CostingBatchNoChangeError/);
    assert.match(service, /changedSinceQuote/);
    assert.match(service, /lastQuotedFingerprint/);
  });

  it("15–18. revision creates linked history and updates latest", () => {
    assert.match(service, /pricingCostingBatchId: batch\.id/);
    assert.match(service, /allowReusePricingCalculationItems: isRevision/);
    assert.match(service, /quotes:/);
    assert.match(schema, /pricingCostingBatchId/);
    assert.match(schema, /CostingBatchQuoteHistory/);
    assert.match(migration, /pricingCostingBatchId/);
  });

  it("19. no-change batch rejects duplicate quote", () => {
    assert.match(service, /Batch chưa có thay đổi sau báo giá gần nhất/);
  });

  it("8. UI exposes dirty/clean lifecycle and history", () => {
    assert.match(workspace, /Tạo báo giá mới/);
    assert.match(workspace, /Có thay đổi sau báo giá/);
    assert.match(workspace, /Không có thay đổi/);
    assert.match(workspace, /Lịch sử báo giá/);
    assert.match(workspace, /Xem \{current\.quoteNo/);
  });

  it("23. ACCEPTED quote with order requires confirmation", () => {
    assert.match(service, /ACCEPTED_QUOTE_EXISTS/);
    assert.match(service, /confirmAcceptedRisk/);
    assert.match(workspace, /ACCEPTED_QUOTE_EXISTS/);
  });

  it("11–14. quote create still copies snapshots \(immutability boundary\)", () => {
    assert.match(quoteService, /pricingSnapshot/);
    assert.match(quoteService, /costEstimate/);
    assert.match(quoteService, /customerCompanySnapshot/);
    assert.match(
      readFileSync(path.join(root, "src/features/quotes/quote-from-pricing-map.ts"), "utf8"),
      /costEstimate: item\.costEstimate/,
    );
  });

  it("22. order conversion still requires ACCEPTED unless relaxed", () => {
    const conversion = readFileSync(
      path.join(root, "src/features/orders/order-conversion.service.ts"),
      "utf8",
    );
    assert.match(conversion, /quote\.status !== "ACCEPTED"/);
  });
});
