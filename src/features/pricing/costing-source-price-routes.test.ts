import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

describe("CostingSourcePrice routes and permissions", () => {
  it("material/trim mutations require production update", () => {
    const materialPost = read("src/app/api/production-materials/[id]/source-prices/route.ts");
    const trimPost = read("src/app/api/production-trims/[id]/source-prices/route.ts");
    assert.match(materialPost, /requireProductionView/);
    assert.match(materialPost, /requireProductionUpdate/);
    assert.match(trimPost, /requireProductionUpdate/);
    assert.doesNotMatch(materialPost, /quotes\/public/);
  });

  it("service source prices require pricing.manage", () => {
    const service = read("src/app/api/pricing/cost-library/[id]/source-prices/route.ts");
    const search = read("src/app/api/pricing/costing-source-search/route.ts");
    const lookup = read("src/app/api/pricing/costing-source-prices/route.ts");
    assert.match(service, /pricing\.manage/);
    assert.match(search, /pricing\.manage/);
    assert.match(lookup, /pricing\.manage/);
  });

  it("picker lookup is source-scoped, bounded, and read-only", () => {
    const lookup = read("src/app/api/pricing/costing-source-prices/route.ts");
    const search = read("src/features/pricing/services/costing-source-search.service.ts");
    const searchRoute = read("src/app/api/pricing/costing-source-search/route.ts");
    assert.match(lookup, /sourceType/);
    assert.match(lookup, /sourceId/);
    assert.match(lookup, /listCostingSourcePricesForPicker/);
    assert.match(lookup, /export async function GET/);
    assert.doesNotMatch(lookup, /export async function POST/);
    assert.match(search, /COSTING_SOURCE_SEARCH_LIMIT/);
    assert.match(search, /tokenizeSearchQuery/);
    assert.match(search, /mergeCostLibraryCatalog/);
    assert.match(searchRoute, /take: COSTING_SOURCE_SEARCH_LIMIT/);
    assert.doesNotMatch(search, /include:\s*\{[\s\S]*costingSourcePrices/);
  });

  it("does not expose source prices on public quote or product APIs", () => {
    const publicQuote = read("src/app/api/quotes/public/[token]/route.ts");
    const publicPdf = read("src/app/api/quotes/public/[token]/pdf/route.ts");
    assert.doesNotMatch(publicQuote, /costing-source-price/);
    assert.doesNotMatch(publicPdf, /costingSourcePrice/);
    const productPublic = read("src/lib/permissions/public-token-safety.ts");
    assert.match(productPublic, /PUBLIC_TOKEN_FORBIDDEN_FIELDS/);
  });

  it("price service does not mutate Costing snapshots", () => {
    const service = read("src/features/pricing/services/costing-source-price.service.ts");
    assert.doesNotMatch(service, /pricingCalculation/);
    assert.doesNotMatch(service, /inputSnapshot/);
    assert.doesNotMatch(service, /resultSnapshot/);
    assert.doesNotMatch(service, /pricingSnapshot/);
    assert.match(service, /productionSupplier/);
  });

  it("does not dual-write ServicePriceRule", () => {
    const service = read("src/features/pricing/services/costing-source-price.service.ts");
    const ui = read("src/components/admin/pricing/CostLibraryManager.tsx");
    assert.doesNotMatch(service, /servicePriceRule/i);
    assert.match(ui, /ServicePriceRule/);
    assert.doesNotMatch(ui, /service-rules/);
  });

  it("cost library promotion is mutation-only, never on GET/list/search", () => {
    const library = read("src/features/pricing/services/cost-library.service.ts");
    const listRoute = read("src/app/api/pricing/cost-library/route.ts");
    const search = read("src/features/pricing/services/costing-source-search.service.ts");
    const lookup = read("src/app/api/pricing/costing-source-prices/route.ts");
    const lookupService = read("src/features/pricing/services/costing-source-price.service.ts");
    assert.doesNotMatch(library, /ensureCanonicalCostLibraryItems/);
    assert.match(library, /promoteBuiltinCostLibraryItem/);
    assert.match(library, /findCostLibraryDbIdReadOnly/);
    assert.match(library, /listCostLibraryItems[\s\S]*mergeCostLibraryCatalog/);
    assert.doesNotMatch(search, /promoteBuiltinCostLibraryItem/);
    assert.doesNotMatch(search, /ensureCanonical/);
    assert.doesNotMatch(lookup, /promoteBuiltin/);
    assert.match(lookupService, /resolveSourceIdForRead/);
    assert.match(lookupService, /resolveCostLibraryItemIdForMutation/);
    assert.match(listRoute, /listCostLibraryItems/);
    const stampUpdate = library.match(/update\(\{[\s\S]*?data:\s*\{\s*legacyBuiltinId:/);
    assert.ok(stampUpdate, "stamp path should only write legacyBuiltinId");
  });

  it("does not change the legacy Costing fabric formula", () => {
    const calculator = read("src/features/pricing/services/costing-calculator.service.ts");
    assert.match(calculator, /fabricPrice \/ fabricConsumption/);
    assert.doesNotMatch(calculator, /unitPrice \* consumption/);
  });

  it("deactivates instead of hard-deleting current prices", () => {
    const panel = read("src/components/admin/pricing/CostingSourcePricePanel.tsx");
    const materialDelete = read("src/app/api/production-materials/[id]/source-prices/[priceId]/route.ts");
    assert.match(panel, /Vô hiệu hóa/);
    assert.match(panel, /Đã vô hiệu hóa/);
    assert.match(panel, /Dùng lại/);
    assert.doesNotMatch(panel, />Xóa</);
    assert.match(materialDelete, /deactivateCostingSourcePrice/);
    assert.match(materialDelete, /Đã vô hiệu hóa/);
  });

  it("upserts the same source\+supplier row even if inactive", () => {
    const service = read("src/features/pricing/services/costing-source-price.service.ts");
    assert.match(
      service,
      /findFirst\(\{[\s\S]*supplierId,[\s\S]*sourceWhere\(/,
    );
    assert.doesNotMatch(
      service,
      /findFirst\(\{[\s\S]{0,180}isActive/,
    );
  });

  it("picker excludes archived suppliers", () => {
    const service = read("src/features/pricing/services/costing-source-price.service.ts");
    const helpers = read("src/features/pricing/costing-source-price.ts");
    assert.match(service, /supplier:\s*\{\s*isActive:\s*true/);
    assert.match(helpers, /supplierIsActive/);
    assert.match(helpers, /activeSuppliersOnly/);
  });

  it("Costing V2 picker uses bounded search, empty-library UX, and no cheapest auto-select", () => {
    const calculator = read("src/components/admin/pricing/CostingCalculator.tsx");
    const picker = read("src/components/admin/pricing/costing/CostingSourcePickerDialog.tsx");
    const search = read("src/features/pricing/services/costing-source-search.service.ts");
    const searchRoute = read("src/app/api/pricing/costing-source-search/route.ts");
    assert.match(calculator, /CostingStructuredSection/);
    assert.match(calculator, /Thông tin tính giá/);
    assert.match(picker, /costing-source-search/);
    assert.match(picker, /300/);
    assert.match(picker, /Chưa có nguyên phụ liệu trong thư viện/);
    assert.match(picker, /\/admin\/production-materials/);
    assert.match(picker, /Vui lòng chọn nhà cung cấp/);
    assert.match(picker, /initialPickerSourcePriceId/);
    assert.match(picker, /sourceType=\$\{encodeURIComponent\(selectedSource\.type\)\}/);
    assert.match(read("src/features/pricing/costing-v2-identity.ts"), /Định mức cũ \(SP\/đơn vị\)/);
    assert.match(read("src/components/admin/pricing/costing/CostingStructuredSection.tsx"), /Thay bằng nguồn V2/);
    assert.doesNotMatch(picker, /Sửa nguyên/);
    assert.match(search, /MATERIALS/);
    assert.match(search, /COSTING_SOURCE_SEARCH_LIMIT/);
    assert.match(searchRoute, /take: COSTING_SOURCE_SEARCH_LIMIT/);
  });
});
