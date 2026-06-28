import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapPublicProductCardSalesBadges,
  mergeCuratedSalesBadgesIntoMetadata,
  parseCuratedSalesBadgeKeysFromMetadata,
  resolveProductSalesBadges,
  validateCuratedSalesBadgeKeys,
} from "./product-sales-badges";

describe("product-sales-badges", () => {
  it("resolves MOQ từ X for valid positive MOQ", () => {
    const badges = resolveProductSalesBadges({ defaultMoq: 30 });
    assert.equal(badges.length, 1);
    assert.equal(badges[0]?.label, "MOQ từ 30");
    assert.equal(badges[0]?.key, "MOQ");
  });

  it("does not create MOQ badge for missing, zero, or invalid MOQ", () => {
    assert.deepEqual(resolveProductSalesBadges({ defaultMoq: null }), []);
    assert.deepEqual(resolveProductSalesBadges({ defaultMoq: 0 }), []);
    assert.deepEqual(resolveProductSalesBadges({ defaultMoq: -5 }), []);
    assert.deepEqual(resolveProductSalesBadges({ defaultMoq: Number.NaN }), []);
  });

  it("resolves In logo riêng only from explicit supportsPrinting", () => {
    assert.equal(resolveProductSalesBadges({ supportsPrinting: true })[0]?.label, "In logo riêng");
    assert.deepEqual(resolveProductSalesBadges({ supportsPrinting: false }), []);
    assert.deepEqual(resolveProductSalesBadges({}), []);
  });

  it("resolves OEM / Private Label only from explicit supportsOem", () => {
    assert.equal(resolveProductSalesBadges({ supportsOem: true })[0]?.label, "OEM / Private Label");
    assert.deepEqual(resolveProductSalesBadges({ supportsOem: false }), []);
  });

  it("persists and resolves curated BEST_SELLER and NEW", () => {
    const metadata = mergeCuratedSalesBadgesIntoMetadata(null, ["BEST_SELLER", "NEW"]);
    assert.deepEqual(parseCuratedSalesBadgeKeysFromMetadata(metadata), ["BEST_SELLER", "NEW"]);
    const badges = resolveProductSalesBadges({ metadata });
    assert.deepEqual(
      badges.map((badge) => badge.label),
      ["Bán chạy", "Mới"],
    );
  });

  it("applies exact deterministic priority order", () => {
    const badges = resolveProductSalesBadges({
      defaultMoq: 50,
      supportsPrinting: true,
      supportsOem: true,
      curatedSalesBadges: ["NEW", "BEST_SELLER"],
    });
    assert.deepEqual(badges.map((badge) => badge.label), ["MOQ từ 50", "Bán chạy"]);
  });

  it("limits output to maximum 2 badges", () => {
    const badges = resolveProductSalesBadges({
      defaultMoq: 20,
      supportsPrinting: true,
      supportsOem: true,
      curatedSalesBadges: ["BEST_SELLER", "NEW"],
    });
    assert.equal(badges.length, 2);
    assert.deepEqual(badges.map((badge) => badge.label), ["MOQ từ 20", "Bán chạy"]);
  });

  it("rejects duplicate curated keys", () => {
    const result = validateCuratedSalesBadgeKeys(["BEST_SELLER", "BEST_SELLER"]);
    assert.ok("error" in result);
    if ("error" in result) {
      assert.match(result.error, /trùng/i);
    }
  });

  it("leaves products without badge configuration unchanged", () => {
    assert.deepEqual(resolveProductSalesBadges({}), []);
    assert.deepEqual(parseCuratedSalesBadgeKeysFromMetadata(null), []);
    assert.deepEqual(parseCuratedSalesBadgeKeysFromMetadata({ other: true }), []);
  });

  it("exposes only normalized public badge payload, not raw metadata", () => {
    const badges = mapPublicProductCardSalesBadges({
      defaultMoq: 30,
      metadata: { curatedSalesBadges: ["BEST_SELLER"], internalOnly: "secret" },
    });
    assert.deepEqual(badges, [
      { key: "MOQ", label: "MOQ từ 30", kind: "automatic", icon: "moq" },
      { key: "BEST_SELLER", label: "Bán chạy", kind: "curated", icon: "flame" },
    ]);
    for (const badge of badges) {
      assert.equal("metadata" in badge, false);
      assert.equal("priority" in badge, false);
    }
  });
});
