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

function assertLoadingBeforeEmpty(source: string, loadingNeedle: string, emptyNeedle: string) {
  const loadingIdx = indexOfOrThrow(source, loadingNeedle, "loading");
  const emptyIdx = indexOfOrThrow(source, emptyNeedle, "empty");
  assert.ok(loadingIdx < emptyIdx, "loading branch should precede empty branch in source");
}

describe("IA-4C list workspace states", () => {
  it("products: loading precedes empty; dataset vs filtered empty; conditional bulk; error surface", () => {
    const source = read("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.match(source, /TableLoading/);
    assert.match(source, /EmptyState/);
    assert.match(source, /Chưa có sản phẩm/);
    assert.match(source, /Không tìm thấy sản phẩm phù hợp/);
    assert.match(source, /listError/);
    assert.match(source, /selectedIds\.size > 0 &&/);
    assert.match(source, /product-bulk-selection-count/);
    assert.doesNotMatch(source, /Đang tải…/);
    assertLoadingBeforeEmpty(source, "TableLoading", "Chưa có sản phẩm");
  });

  it("customers: EmptyState distinguishes dataset vs filtered; filters stay mounted; bulk conditional", () => {
    const source = read("src/components/admin/crm/CrmCustomersList.tsx");
    assert.match(source, /EmptyState/);
    assert.match(source, /Chưa có khách hàng/);
    assert.match(source, /Không tìm thấy khách hàng phù hợp/);
    assert.match(source, /TableLoading/);
    assert.match(source, /customers-workspace-filters/);
    assert.match(source, /selectedIds\.size > 0 \?/);
    const filtersIdx = indexOfOrThrow(source, "customers-workspace-filters", "filters");
    const loadingIdx = indexOfOrThrow(source, "Đang tải danh sách khách hàng", "loading label");
    assert.ok(filtersIdx < loadingIdx, "filters should remain mounted before loading surface");
  });

  it("material suppliers: AdminLoadingState + EmptyState; no ad-hoc empty paragraph", () => {
    const source = read("src/components/admin/materials/MaterialSuppliersList.tsx");
    assert.match(source, /AdminLoadingState/);
    assert.match(source, /EmptyState/);
    assert.match(source, /Chưa có nhà cung cấp/);
    assert.match(source, /Không tìm thấy nhà cung cấp phù hợp/);
    assert.doesNotMatch(source, /<p className="admin-empty-state">/);
  });

  it("tech packs / patterns / production: filter-aware empty; load error empty-only", () => {
    const tech = read("src/components/admin/tech-pack/TechPackListManager.tsx");
    const patterns = read("src/components/admin/patterns/PatternListManager.tsx");
    const masters = read("src/components/admin/production-master/ProductionMasterListManager.tsx");
    assert.match(tech, /Không tìm thấy Tech Pack phù hợp/);
    assert.match(tech, /Chưa có Tech Pack/);
    assert.match(tech, /error && items\.length === 0/);
    assert.match(patterns, /Không tìm thấy rập phù hợp/);
    assert.match(patterns, /error && items\.length === 0/);
    assert.match(masters, /Không tìm thấy kết quả phù hợp/);
    assert.match(masters, /error && items\.length === 0/);
    assert.match(tech, /AdminLoadingState/);
    assert.match(patterns, /AdminLoadingState/);
    assert.match(masters, /AdminLoadingState/);
  });

  it("content reviews: no plain-text loader; queue empty vs filtered; moderation actions remain", () => {
    const source = read("src/components/admin/content/ContentReviewsClient.tsx");
    assert.match(source, /AdminLoadingState/);
    assert.doesNotMatch(source, /<p>Đang tải…<\/p>/);
    assert.match(source, /useState\(true\)/);
    assert.match(source, /Chưa có bài chờ kiểm duyệt/);
    assert.match(source, /Không có bài phù hợp với bộ lọc hiện tại/);
    assert.match(source, /WorkspaceToolbarEnd/);
    assert.match(source, /Làm mới/);
    assert.match(source, /Gán cho tôi/);
    assert.match(source, /href=\{primaryHref\}/);
    assert.doesNotMatch(source, /Thêm |Tạo mới|create CTA/i);
  });

  it("content publishing: single global empty; loading primitive; no conflicting empties when all empty", () => {
    const source = read("src/components/admin/content/ContentPublishingDashboardClient.tsx");
    assert.match(source, /AdminLoadingState/);
    assert.match(source, /allQueuesEmpty/);
    assert.match(source, /Chưa có bài trong hàng đợi xuất bản/);
    assert.match(source, /title: "Ready"/);
    assert.match(source, /WorkspaceToolbarEnd/);
    assert.match(source, /Làm mới/);
    const globalEmptyIdx = indexOfOrThrow(
      source,
      "Chưa có bài trong hàng đợi xuất bản",
      "global empty",
    );
    const queuesRenderIdx = indexOfOrThrow(source, 'renderQueue("ready")', "queues");
    assert.ok(globalEmptyIdx < queuesRenderIdx);
  });

  it("preserves IA-4A toolbar ordering and IA-4B spacing markers", () => {
    const products = read("src/components/admin/products/ProductCatalogDashboard.tsx");
    const customers = read("src/components/admin/crm/CrmCustomersList.tsx");
    const reviews = read("src/components/admin/content/ContentReviewsClient.tsx");
    const publishing = read("src/components/admin/content/ContentPublishingDashboardClient.tsx");
    assert.ok(products.indexOf("Nhập sản phẩm") < products.indexOf('href="/admin/products/new"'));
    assert.ok(
      customers.indexOf('href="/admin/crm/customers/import"') <
        customers.indexOf('href="/admin/crm/customers/new"'),
    );
    assert.match(products, /marginBottom:\s*0/);
    assert.match(reviews, /className="admin-panel"/);
    assert.match(publishing, /className="admin-panel"/);
    assert.doesNotMatch(
      read("src/components/admin/tech-pack/TechPackListManager.tsx"),
      /data-testid="tech-pack-workspace-toolbar"[^>]*marginBottom/,
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
  });
});
