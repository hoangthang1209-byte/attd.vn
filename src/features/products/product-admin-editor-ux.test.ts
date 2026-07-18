import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product editor UX compaction", () => {
  const form = read("src/components/admin/products/ProductCatalogForm.tsx");
  const editPage = read("src/app/(backend)/admin/products/[id]/edit/page.tsx");
  const checklist = read("src/components/admin/products/ProductSetupChecklist.tsx");
  const sizeChart = read("src/components/admin/products/ProductSizeChartEditor.tsx");
  const optionBuilder = read("src/components/admin/products/ProductOptionGroupBuilder.tsx");
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
    assert.match(form, /admin-catalog-section-help/);
  });

  it("does not duplicate product title in form header", () => {
    assert.match(editPage, /AdminPageTitle title=\{product\.name\}/);
    assert.match(form, /data-testid="product-catalog-form-header"/);
    assert.match(form, /data-testid="product-editor-code"/);
    assert.doesNotMatch(form, /Sửa:\s*\{/);
    assert.doesNotMatch(form, /admin-catalog-form__title">\{form\.name\}/);
  });

  it("activates section pills by section id to avoid dual highlight", () => {
    assert.match(form, /activeSectionId === section\.id/);
    assert.match(form, /setActiveSectionId/);
    assert.doesNotMatch(
      form,
      /className=\{`admin-catalog-section-nav__link\$\{activeTab === section\.tab/,
    );
  });

  it("clears dirty snapshot after matrix stay-saves", () => {
    assert.match(form, /ensureOptionsSavedForMatrix/);
    assert.match(form, /saveProductForMatrixGeneration/);
    assert.match(form, /queueMicrotask\(\(\) => setSavedFormSnapshot\(JSON\.stringify\(formRef\.current\)\)\)/);
    assert.match(form, /queueMicrotask\(\(\) => setSavedFormSnapshot\(JSON\.stringify\(next\)\)\)/);
  });

  it("separates pill active/hover/focus and avoids sticky overlap", () => {
    assert.match(form, /admin-content-scroll/);
    assert.match(form, /headerOffset/);
    assert.match(css, /\.admin-catalog-section-nav\s*\{[\s\S]*?position:\s*static/);
    assert.match(css, /\.admin-catalog-section-nav__link:hover:not\(\.is-active\)/);
    assert.match(css, /\.admin-catalog-section-nav__link:focus-visible/);
    assert.match(css, /\.admin-catalog-section-nav__link\.is-active\s*\{/);
    assert.match(form, /admin-product-edit-dense/);
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
    assert.match(form, /product-editor-dirty-state/);
    assert.match(css, /admin-catalog-form--onescreen[\s\S]*padding-bottom:\s*112px/);
    assert.match(css, /html\.admin-product-edit-dense[\s\S]*padding-bottom:\s*128px/);
  });

  it("supports select-all/clear, color management link, and safe quick create", () => {
    assert.match(form, /ProductCatalogVariantsSection/);
    assert.match(form, /onBeforeMatrixGenerate/);
    assert.match(form, /ProductContentSuggestButton/);
    assert.match(optionBuilder, /data-testid="manage-colors-link"/);
    assert.match(optionBuilder, /Quản lý màu sắc/);
    assert.match(optionBuilder, /href="\/admin\/attributes"/);
    assert.match(optionBuilder, /data-testid="shared-values-select-all"/);
    assert.match(optionBuilder, /Chọn tất cả/);
    assert.match(optionBuilder, /data-testid="shared-values-clear-selection"/);
    assert.match(optionBuilder, /Bỏ chọn/);
    assert.match(optionBuilder, /product-editor-quick-value-create/);
  });
});

describe("attributes page UX compaction", () => {
  const source = read("src/components/admin/products/ProductAttributesClient.tsx");
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0082_attribute_value_name_en/migration.sql");

  it("prioritizes attribute list and collapses create forms by default", () => {
    assert.match(source, /data-testid="admin-attributes-page"/);
    assert.match(source, /data-testid="attributes-list"/);
    assert.match(source, /showCreateAttribute/);
    assert.match(source, /data-testid="attributes-toggle-create"/);
    assert.match(source, /showCreateAttribute &&/);
    assert.match(source, /showAdvancedValueForm &&/);
    assert.match(source, /Thêm giá trị nâng cao/);
    const listIdx = source.indexOf('data-testid="attributes-list"');
    const advancedIdx = source.indexOf('data-testid="attributes-create-value-form"');
    assert.ok(listIdx > 0);
    assert.ok(advancedIdx > listIdx);
  });

  it("expands bilingual inline value table with color columns and quick-add row", () => {
    assert.match(source, /Quản lý giá trị/);
    assert.match(source, /manageValues/);
    assert.match(source, /Tên tiếng Việt/);
    assert.match(source, /Tên tiếng Anh/);
    assert.match(source, /HEX màu/);
    assert.match(source, /\+ Thêm màu mới/);
    assert.match(source, /\+ Thêm giá trị mới/);
    assert.match(source, /quick-add-row/);
    assert.match(source, /submitQuickAdd/);
    assert.match(source, /suggestAttributeValueCode/);
    assert.match(source, /isValidHexColor/);
    assert.match(source, /ATTRIBUTE_VALUE_DUPLICATE_MESSAGE/);
    assert.match(source, /admin-attribute-swatch--light/);
    assert.match(schema, /model ProductAttributeValue[\s\S]*nameEn\s+String\?/);
    assert.match(schema, /model ProductAttribute \{[\s\S]*nameEn\s+String\?/);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS "nameEn"/);
  });

  it("keeps search, inactive toggle, and row value actions", () => {
    assert.match(source, /attributes-search/);
    assert.match(source, /Hiện ngừng sử dụng/);
    assert.match(source, /Sửa nhanh/);
    assert.match(source, /Tạo từ bộ mặc định/);
    assert.match(source, /Ngưng sử dụng|Ngừng/);
  });
});
