import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function indexOfOrThrow(source: string, needle: string, label: string) {
  const idx = source.indexOf(needle);
  assert.ok(idx >= 0, `missing ${label}: ${needle}`);
  return idx;
}

describe("IA-4B workspace spacing rhythm", () => {
  it("customers: PageHeader replaces section-header; bulk only when selected", () => {
    const source = read("src/components/admin/crm/CrmCustomersList.tsx");
    assert.match(source, /PageHeader/);
    assert.doesNotMatch(source, /admin-section-header/);
    assert.match(source, /className="admin-panel"/);
    assert.match(source, /selectedIds\.size > 0 \?/);
    assert.match(source, /data-testid="customers-workspace-actions"/);
    assert.match(source, /data-testid="customers-workspace-filters"/);
    const headerIdx = indexOfOrThrow(source, "PageHeader", "PageHeader");
    const filtersIdx = indexOfOrThrow(source, "customers-workspace-filters", "filters");
    assert.ok(headerIdx < filtersIdx, "PageHeader should precede filters");
  });

  it("products: bulk toolbar is conditional and does not add outer margin", () => {
    const source = read("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.match(source, /selectedIds\.size > 0 &&/);
    assert.match(source, /data-testid="product-bulk-toolbar"/);
    assert.match(source, /style=\{\{\s*marginBottom:\s*0\s*\}\}/);
    assert.match(source, /admin-catalog-page product-admin-list/);
    assert.match(source, /product-admin-filters/);
    const toolbarIdx = indexOfOrThrow(source, "product-workspace-toolbar", "toolbar");
    const bulkIdx = indexOfOrThrow(source, "product-bulk-toolbar", "bulk");
    const filtersIdx = indexOfOrThrow(source, "product-admin-filters", "filters");
    assert.ok(toolbarIdx < bulkIdx && bulkIdx < filtersIdx);
  });

  it("tech pack: DataToolbar has no duplicate outer marginBottom", () => {
    const source = read("src/components/admin/tech-pack/TechPackListManager.tsx");
    assert.match(source, /AdminPageShell/);
    assert.match(source, /data-testid="tech-pack-workspace-toolbar"/);
    assert.doesNotMatch(
      source,
      /data-testid="tech-pack-workspace-toolbar"[^>]*marginBottom/,
    );
    const toolbarIdx = indexOfOrThrow(source, "tech-pack-workspace-toolbar", "toolbar");
    const chipsIdx = indexOfOrThrow(source, "prod-plan-chips", "chips");
    assert.ok(toolbarIdx < chipsIdx);
  });

  it("material suppliers: admin-panel owns spacing around PageHeader + DataToolbar", () => {
    const source = read("src/components/admin/materials/MaterialSuppliersList.tsx");
    assert.match(source, /className="admin-panel"/);
    assert.match(source, /PageHeader/);
    assert.match(source, /DataToolbar/);
    assert.doesNotMatch(source, /DataToolbar[^>]*marginBottom/);
  });

  it("patterns and production master keep AdminPageShell rhythm", () => {
    const patterns = read("src/components/admin/patterns/PatternListManager.tsx");
    const masters = read("src/components/admin/production-master/ProductionMasterListManager.tsx");
    assert.match(patterns, /AdminPageShell/);
    assert.match(patterns, /DataToolbar/);
    assert.match(masters, /AdminPageShell/);
    assert.match(masters, /DataToolbar/);
  });

  it("content reviews/publishing use admin-panel; no empty admin-page wrappers", () => {
    const reviews = read("src/components/admin/content/ContentReviewsClient.tsx");
    const publishing = read("src/components/admin/content/ContentPublishingDashboardClient.tsx");
    assert.match(reviews, /className="admin-panel"/);
    assert.doesNotMatch(reviews, /className="admin-page"/);
    assert.match(reviews, /admin-field-hint/);
    assert.match(reviews, /content-reviews-toolbar/);
    assert.match(publishing, /className="admin-panel"/);
    assert.doesNotMatch(publishing, /className="admin-page"/);
    assert.doesNotMatch(publishing, /admin-sidebar-card"[^>]*marginBottom/);
    assert.match(publishing, /content-publishing-toolbar/);
    const hintIdx = indexOfOrThrow(reviews, "admin-field-hint", "hint");
    const toolbarIdx = indexOfOrThrow(reviews, "content-reviews-toolbar", "toolbar");
    assert.ok(hintIdx < toolbarIdx, "workflow hint stays above toolbar");
  });

  it("preserves IA-4A toolbar ordering and primary actions", () => {
    const products = read("src/components/admin/products/ProductCatalogDashboard.tsx");
    const customers = read("src/components/admin/crm/CrmCustomersList.tsx");
    const techPack = read("src/components/admin/tech-pack/TechPackListManager.tsx");
    assert.ok(products.indexOf("Nhập sản phẩm") < products.indexOf('href="/admin/products/new"'));
    assert.ok(
      customers.indexOf('href="/admin/crm/customers/import"') <
        customers.indexOf('href="/admin/crm/customers/new"'),
    );
    assert.match(techPack, /Tạo Tech Pack/);
    assert.match(
      read("src/components/admin/content/ContentReviewsClient.tsx"),
      /WorkspaceToolbarEnd/,
    );
  });

  it("does not regress page identity, navigation, breadcrumbs, AdminShell, or globals.css", () => {
    assert.doesNotMatch(
      read("src/components/admin/content/ContentReviewsClient.tsx"),
      /<h1[^>]*>\s*Kiểm duyệt nội dung\s*<\/h1>/,
    );
    assert.doesNotMatch(
      read("src/components/admin/content/ContentPublishingDashboardClient.tsx"),
      /<h1[^>]*>\s*Xuất bản nội dung\s*<\/h1>/,
    );
    assert.match(read("src/lib/admin/admin-navigation.ts"), /KNOWLEDGE & AI/);
    assert.match(read("src/lib/admin/admin-breadcrumbs.ts"), /KNOWLEDGE & AI/);
    assert.match(read("src/components/admin/AdminShell.tsx"), /pageTitle/);
    assert.match(read("src/components/admin/AdminUi.tsx"), /WorkspaceToolbarEnd/);
  });
});
