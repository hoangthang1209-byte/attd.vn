import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product admin list readiness UX", () => {
  const dashboard = read("src/components/admin/products/ProductCatalogDashboard.tsx");

  it("renders readiness badges, filter, summary, and Hoàn thiện link", () => {
    assert.match(dashboard, /product-readiness-summary/);
    assert.match(dashboard, /product-readiness-filter/);
    assert.match(dashboard, /evaluateProductReadiness/);
    assert.match(dashboard, /PRODUCT_READINESS_BADGE_LABELS/);
    assert.match(dashboard, /Hoàn thiện/);
    assert.match(dashboard, /href=\{`\/admin\/products\/\$\{p\.id\}\/edit`\}/);
    assert.match(dashboard, /Thiếu ảnh|missing_image/);
  });

  it("keeps existing search/category/status filters", () => {
    assert.match(dashboard, /Tìm tên sản phẩm, mã hàng, SKU/);
    assert.match(dashboard, /Tất cả danh mục/);
    assert.match(dashboard, /Tất cả trạng thái/);
    assert.match(dashboard, /Tất cả tồn kho/);
  });
});
