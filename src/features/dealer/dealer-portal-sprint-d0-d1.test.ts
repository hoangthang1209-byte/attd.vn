import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { formatDealerCompanyCodeFromCount } from "@/features/dealer/dealer-code";
import {
  isValidDealerCompanyStatus,
  isValidDealerCompanyType,
  isValidDealerLevel,
  isValidDealerUserRole,
  normalizeDealerEmail,
  DealerValidationError,
} from "@/features/dealer/dealer-validation";
import { DEALER_COMPANY_STATUS_LABELS } from "@/features/dealer/labels";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("dealer-portal-sprint-d0-d1", () => {
  it("formats dealer company codes as DL-000001", () => {
    assert.equal(formatDealerCompanyCodeFromCount(0), "DL-000001");
    assert.equal(formatDealerCompanyCodeFromCount(42), "DL-000043");
  });

  it("validates dealer enums", () => {
    assert.equal(isValidDealerCompanyType("DEALER"), true);
    assert.equal(isValidDealerCompanyType("RETAIL"), false);
    assert.equal(isValidDealerCompanyStatus("PENDING"), true);
    assert.equal(isValidDealerLevel("GOLD"), true);
    assert.equal(isValidDealerUserRole("OWNER"), true);
  });

  it("normalizes dealer email", () => {
    assert.equal(normalizeDealerEmail("  Dealer@Example.COM "), "dealer@example.com");
    assert.throws(() => normalizeDealerEmail("invalid"), DealerValidationError);
  });

  it("exposes Vietnamese status labels", () => {
    assert.equal(DEALER_COMPANY_STATUS_LABELS.PENDING, "Chờ duyệt");
    assert.equal(DEALER_COMPANY_STATUS_LABELS.APPROVED, "Đã duyệt");
  });

  it("ships admin dealer API routes", () => {
    const routes = [
      "src/app/api/dealer/companies/route.ts",
      "src/app/api/dealer/companies/[id]/approve/route.ts",
      "src/app/api/dealer/companies/[id]/reject/route.ts",
      "src/app/api/dealer/companies/[id]/link-customer/route.ts",
      "src/app/api/dealer/companies/[id]/assign-price-group/route.ts",
      "src/app/api/dealer/companies/[id]/users/route.ts",
      "src/app/api/dealer/users/[id]/disable/route.ts",
      "src/app/api/dealer/companies/[id]/activities/route.ts",
    ];
    for (const route of routes) {
      assert.ok(readRepoFile(route).includes("requireAdminApiFromCookies"));
    }
  });

  it("ships dealer portal workspace routes at /portal", () => {
    assert.match(readRepoFile("src/app/(b2b-portal)/portal/page.tsx"), /Cổng làm việc B2B|Bạn muốn làm gì hôm nay/);
    assert.match(readRepoFile("src/app/(b2b-portal)/portal/rfq/page.tsx"), /Gửi yêu cầu báo giá B2B/);
    assert.match(readRepoFile("src/app/(b2b-portal)/portal/quotes/page.tsx"), /Báo giá của bạn/);
    assert.match(readRepoFile("src/app/(b2b-portal)/portal/resources/page.tsx"), /Tài nguyên đại lý/);
  });
});
