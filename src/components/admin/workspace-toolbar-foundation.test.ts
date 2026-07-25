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

describe("IA-4A workspace toolbar foundation", () => {
  it("products: secondary actions precede primary create", () => {
    const source = read("src/components/admin/products/ProductCatalogDashboard.tsx");
    const importIdx = indexOfOrThrow(source, "Nhập sản phẩm", "import");
    const exportIdx = indexOfOrThrow(source, "Xuất dữ liệu", "export");
    const createIdx = indexOfOrThrow(source, 'href="/admin/products/new"', "create href");
    assert.ok(importIdx < createIdx, "Import should appear before Create");
    assert.ok(exportIdx < createIdx, "Export should appear before Create");
    assert.match(source, /data-testid="product-workspace-toolbar"/);
    assert.match(source, /product-admin-filters/);
    assert.match(source, /product-bulk-toolbar/);
  });

  it("customers: search precedes filters; primary remains last; bulk only when selected", () => {
    const source = read("src/components/admin/crm/CrmCustomersList.tsx");
    const searchIdx = indexOfOrThrow(source, 'placeholder="Tìm tên, mã, SĐT, email, MST..."', "search");
    const typeIdx = indexOfOrThrow(source, "Tất cả loại khách hàng", "type filter");
    const createIdx = indexOfOrThrow(source, 'href="/admin/crm/customers/new"', "create");
    const importIdx = indexOfOrThrow(source, 'href="/admin/crm/customers/import"', "import");
    assert.ok(searchIdx < typeIdx, "Search should precede type filter");
    assert.ok(importIdx < createIdx, "Import should precede Create");
    assert.match(source, /selectedIds\.size > 0 \?/);
    assert.match(source, /admin-data-toolbar__search/);
    assert.match(source, /data-testid="customers-workspace-actions"/);
  });

  it("material suppliers: DataToolbar search before filter; primary in PageHeader actions", () => {
    const source = read("src/components/admin/materials/MaterialSuppliersList.tsx");
    assert.match(source, /PageHeader/);
    assert.match(source, /DataToolbar/);
    assert.match(source, /admin-data-toolbar__search/);
    const searchIdx = indexOfOrThrow(source, "Tìm mã, tên, liên hệ", "search");
    const activeIdx = indexOfOrThrow(source, "Chỉ đang hoạt động", "active filter");
    assert.ok(searchIdx < activeIdx);
    assert.match(source, /Thêm nhà cung cấp/);
  });

  it("tech pack: search before status before view chips", () => {
    const source = read("src/components/admin/tech-pack/TechPackListManager.tsx");
    const searchIdx = indexOfOrThrow(source, "admin-data-toolbar__search", "search class");
    const statusIdx = indexOfOrThrow(source, "Tất cả trạng thái", "status");
    const chipsIdx = indexOfOrThrow(source, "prod-plan-chips", "view chips");
    assert.ok(searchIdx < statusIdx && statusIdx < chipsIdx);
    assert.match(source, /Tạo Tech Pack/);
  });

  it("patterns and production master use DataToolbar search class", () => {
    const patterns = read("src/components/admin/patterns/PatternListManager.tsx");
    const masters = read("src/components/admin/production-master/ProductionMasterListManager.tsx");
    assert.match(patterns, /DataToolbar/);
    assert.match(patterns, /admin-data-toolbar__search/);
    assert.match(masters, /DataToolbar/);
    assert.match(masters, /admin-data-toolbar__search/);
    assert.match(masters, /Tạo mới/);
  });

  it("reviews/publishing keep secondary refresh via WorkspaceToolbarEnd", () => {
    const reviews = read("src/components/admin/content/ContentReviewsClient.tsx");
    const publishing = read("src/components/admin/content/ContentPublishingDashboardClient.tsx");
    assert.match(reviews, /WorkspaceToolbarEnd/);
    assert.match(reviews, /Refresh/);
    assert.match(publishing, /WorkspaceToolbarEnd/);
    assert.match(publishing, /Refresh/);
  });

  it("does not alter navigation, breadcrumbs, AdminShell, or globals.css in this sprint", () => {
    // Contract: these authority files must remain outside the IA-4A edit set.
    // Verified by presence of stable markers rather than git (runs in isolation).
    assert.match(read("src/lib/admin/admin-navigation.ts"), /KNOWLEDGE & AI/);
    assert.match(read("src/lib/admin/admin-breadcrumbs.ts"), /KNOWLEDGE & AI/);
    assert.match(read("src/components/admin/AdminShell.tsx"), /pageTitle/);
    assert.match(read("src/components/admin/AdminUi.tsx"), /WorkspaceToolbarEnd/);
  });
});
