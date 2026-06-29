import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readPortalRfqSources(): string {
  const files = [
    "src/components/portal/PortalRfqList.tsx",
    "src/components/portal/PortalRfqForm.tsx",
    "src/components/portal/PortalRfqDetail.tsx",
    "src/app/(b2b-portal)/portal/rfq/page.tsx",
    "src/app/(b2b-portal)/portal/rfq/new/page.tsx",
  ];
  return files.map(readRepoFile).join("\n");
}

describe("dealer-portal-sprint-d3", () => {
  it("formats RFQ codes as RFQ-000001", () => {
    const codeGen = readRepoFile("src/features/dealer/dealer-rfq-code.ts");
    assert.match(codeGen, /RFQ-\$\{String\(count \+ 1\)\.padStart\(6, "0"\)\}/);
    assert.match(codeGen, /formatDealerRFQCodeFromCount/);
  });

  it("requires approved portal session for portal RFQ APIs", () => {
    const route = readRepoFile("src/app/api/portal/rfqs/route.ts");
    assert.match(route, /requireApprovedDealerPortalFromCookies/);
  });

  it("blocks pending dealers via approved portal guard", () => {
    const guard = readRepoFile("src/lib/dealer-auth/require-dealer-portal.ts");
    assert.match(guard, /companyStatus !== "APPROVED"/);
    const businessGuard = readRepoFile("src/components/portal/PortalBusinessGuard.tsx");
    assert.match(businessGuard, /ctx\.kind === "pending"/);
  });

  it("scopes dealer RFQ access by company in service", () => {
    const service = readRepoFile("src/features/dealer/services/dealer-rfq.service.ts");
    assert.match(service, /getDealerRFQForCompany/);
    assert.match(service, /dealerCompanyId/);
    assert.match(service, /submittedAt/);
    assert.match(service, /status: "SUBMITTED"/);
  });

  it("creates DealerActivity on status change and CRM conversion", () => {
    const service = readRepoFile("src/features/dealer/services/dealer-rfq.service.ts");
    assert.match(service, /updateDealerRFQStatus/);
    assert.match(service, /convertDealerRFQToLead/);
    assert.match(service, /createDealerActivity|dealerActivity\.create/);
    assert.match(service, /leadId: lead\.id/);
  });

  it("converts RFQ to CRM Lead with DEALER source", () => {
    const service = readRepoFile("src/features/dealer/services/dealer-rfq.service.ts");
    assert.match(service, /source: "DEALER"/);
    assert.match(service, /B2B Portal RFQ/);
  });

  it("ships admin RFQ routes with admin auth", () => {
    for (const route of [
      "src/app/api/dealer/rfqs/route.ts",
      "src/app/api/dealer/rfqs/[id]/convert-lead/route.ts",
      "src/app/api/dealer/rfqs/[id]/status/route.ts",
    ]) {
      assert.match(readRepoFile(route), /requireAdminApiFromCookies/);
    }
  });

  it("portal RFQ UI avoids B2C marketplace keywords", () => {
    const sources = readPortalRfqSources();
    const forbidden = ["Mua ngay", "Giỏ hàng", "Thanh toán", "checkout", "flash sale"];
    for (const word of forbidden) {
      assert.doesNotMatch(sources, new RegExp(word, "i"), `found forbidden: ${word}`);
    }
  });

  it("portal form allows free-text product without forcing SKU", () => {
    const form = readRepoFile("src/components/portal/PortalRfqForm.tsx");
    assert.match(form, /không bắt buộc chọn SKU|SKU \(nếu có\)/i);
    assert.doesNotMatch(form, /productId.*required/i);
  });
});
