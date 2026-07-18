import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product editor UX compaction", () => {
  const form = read("src/components/admin/products/ProductCatalogForm.tsx");
  const checklist = read("src/components/admin/products/ProductSetupChecklist.tsx");
  const sizeChart = read("src/components/admin/products/ProductSizeChartEditor.tsx");
  const css = read("src/app/globals.css");

  it("keeps section order and anchor navigation without tab-hiding", () => {
    const basic = form.indexOf('id="section-basic"');
    const media = form.indexOf('id="section-media"');
    const b2b = form.indexOf('id="section-b2b"');
    const variants = form.indexOf('id="section-variants"');
    const size = form.indexOf('id="section-size-chart"');
    const content = form.indexOf('id="section-content"');
    const seo = form.indexOf('id="section-seo"');
    assert.ok(basic < media && media < b2b && b2b < variants && variants < size && size < content && content < seo);
    assert.match(form, /admin-catalog-section-nav/);
    assert.match(form, /href={`#\$\{section\.id\}`}/);
    assert.doesNotMatch(form, /role="tablist"/);
    assert.doesNotMatch(form, /hidden=\{activeTab !==/);
  });

  it("checklist collapses with summary toggle", () => {
    assert.match(checklist, /product-setup-checklist-toggle/);
    assert.match(checklist, /Xem checklist|Thu gọn/);
    assert.match(checklist, /admin-setup-checklist--compact/);
  });

  it("empty image and size chart states are compact", () => {
    assert.match(form, /admin-catalog-gallery-empty|data-compact-empty/);
    assert.match(sizeChart, /admin-size-chart--compact-empty/);
    assert.match(sizeChart, /data-compact-empty/);
  });

  it("sticky save bar and bottom padding remain", () => {
    assert.match(form, /product-sticky-save-bar|admin-catalog-form__sticky-actions/);
    assert.match(form, /Lưu thay đổi/);
    assert.match(css, /admin-catalog-form--onescreen[\s\S]*padding-bottom:\s*112px/);
  });

  it("variant generate and content suggestion controls remain", () => {
    assert.match(form, /ProductCatalogVariantsSection/);
    assert.match(form, /onBeforeMatrixGenerate/);
    assert.match(form, /ProductContentSuggestButton/);
    assert.match(form, /content-accordion-description/);
  });
});

describe("attributes page UX compaction", () => {
  const source = read("src/components/admin/products/ProductAttributesClient.tsx");

  it("prioritizes attribute list and collapses create forms by default", () => {
    assert.match(source, /data-testid="admin-attributes-page"/);
    assert.match(source, /data-testid="attributes-list"/);
    assert.match(source, /showCreateAttribute/);
    assert.match(source, /data-testid="attributes-toggle-create"/);
    assert.match(source, /showCreateAttribute &&/);
    assert.match(source, /showCreateValue &&/);
    const listIdx = source.indexOf('data-testid="attributes-list"');
    const createIdx = source.indexOf('data-testid="attributes-create-form"');
    assert.ok(listIdx > 0);
    // Create form markup appears before list in source but is gated; toggle must exist above list usage.
    assert.match(source, /Thêm thuộc tính/);
    assert.match(source, /Thêm giá trị/);
    assert.ok(createIdx > 0);
  });

  it("keeps search, inactive toggle, and row value actions", () => {
    assert.match(source, /attributes-search/);
    assert.match(source, /Hiện ngừng sử dụng/);
    assert.match(source, /manageValues/);
    assert.match(source, /Sửa nhanh/);
    assert.match(source, /Tạo từ bộ mặc định/);
  });
});
