import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePublicWebsiteLead,
  websiteAttdAdapter,
} from "@/features/crm/lead-intake/adapters/website.adapter";
import { LEAD_INTAKE_WEBSITE_SITES } from "@/features/crm/lead-intake/taxonomy";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";

describe("website lead intake adapter", () => {
  it("requires name and phone", () => {
    assert.throws(
      () => normalizePublicWebsiteLead({ name: "", phone: "090" }),
      LeadIntakeValidationError
    );
  });

  it("maps ATTD site key and submission id", () => {
    const normalized = normalizePublicWebsiteLead(
      {
        name: "An",
        phone: "0901111222",
        siteKey: "ATTD",
        submissionId: "form-123",
      },
      { fallbackSite: LEAD_INTAKE_WEBSITE_SITES.AOTHUN }
    );
    assert.equal(normalized.site.key, "ATTD");
    assert.equal(normalized.sourceRef, "form-123");
    assert.equal(normalized.intakeMetadata?.siteKey, "ATTD");
  });

  it("adapter normalizes product inquiry as PRODUCT_INQUIRY", async () => {
    const input = await websiteAttdAdapter.normalizeInboundLead(
      {
        name: "An",
        phone: "0901111222",
        productInquiry: { productId: "prod-1", productUrl: "https://attd.vn/p/1" },
      },
      { adapterKey: "website-attd" }
    );
    assert.equal(input.source, "PRODUCT_INQUIRY");
    assert.equal(input.channel, "WEBSITE");
  });
});
