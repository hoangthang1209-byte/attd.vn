import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FORM_PATH = join(
  process.cwd(),
  "src/components/admin/products/ProductCatalogForm.tsx",
);

describe("one-screen product admin editor", () => {
  const source = readFileSync(FORM_PATH, "utf8");

  it("renders major sections on one screen without tablist navigation", () => {
    assert.match(source, /data-testid="product-catalog-form-onescreen"/);
    assert.match(source, /id="section-basic"/);
    assert.match(source, /id="section-media"/);
    assert.match(source, /id="section-b2b"/);
    assert.match(source, /id="section-variants"/);
    assert.match(source, /id="section-size-chart"/);
    assert.match(source, /id="section-content"/);
    assert.match(source, /id="section-seo"/);
    assert.doesNotMatch(source, /role="tablist"/);
    assert.doesNotMatch(source, /hidden=\{activeTab !==/);
  });

  it("keeps variant generation and size chart editor available", () => {
    assert.match(source, /ProductCatalogVariantsSection/);
    assert.match(source, /onBeforeMatrixGenerate/);
    assert.match(source, /ProductSizeChartEditor/);
    assert.match(source, /publicSizeChart/);
  });

  it("keeps sticky save actions", () => {
    assert.match(source, /admin-catalog-form__sticky-actions/);
    assert.match(source, /Lưu thay đổi/);
  });
});

describe("public size chart section component", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/marketplace/ProductSizeChartSection.tsx"),
    "utf8",
  );

  it("renders Bảng size HTML table", () => {
    assert.match(source, /Bảng size|DEFAULT_SIZE_CHART_TITLE|title/);
    assert.match(source, /<table/);
    assert.match(source, /Đơn vị:/);
    assert.match(source, /mp-pdp-size-chart/);
  });
});
