import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeLeadAttributionFields,
  normalizeMarketingAttribution,
} from "@/features/growth/normalize-attribution";

test("normalizeMarketingAttribution maps paid search UTM", () => {
  const result = normalizeMarketingAttribution({
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "Uniform B2B Q1",
  });
  assert.equal(result.marketingChannel, "PAID_SEARCH");
  assert.equal(result.marketingCampaign, "uniform-b2b-q1");
});

test("normalizeMarketingAttribution falls back to product inquiry source", () => {
  const result = normalizeMarketingAttribution({
    leadSource: "PRODUCT_INQUIRY",
  });
  assert.equal(result.marketingChannel, "PRODUCT_INQUIRY");
});

test("mergeLeadAttributionFields preserves first-touch UTM", () => {
  const merged = mergeLeadAttributionFields({
    existing: {
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "retarget-a",
      marketingChannel: "PAID_SOCIAL",
      marketingCampaign: "retarget-a",
    },
    incoming: {
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "other",
    },
    leadSource: "CONTACT",
  });
  assert.equal(merged.utmSource, "facebook");
  assert.equal(merged.marketingChannel, "PAID_SOCIAL");
});
