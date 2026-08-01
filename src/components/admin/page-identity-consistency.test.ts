import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("IA-3B page identity consistency", () => {
  it("orders list does not render a duplicate page-level Đơn hàng heading", () => {
    const source = read("src/components/admin/orders/OrderListManager.tsx");
    assert.doesNotMatch(source, /<h1[^>]*>\s*Đơn hàng\s*<\/h1>/);
    assert.doesNotMatch(source, /order-ops-header__title/);
    assert.doesNotMatch(source, /order-ops-header__subtitle/);
    assert.match(source, /Tạo đơn hàng/);
    assert.match(source, /order-ops-toolbar/);
    assert.match(source, /order-ops-kpi/);
  });

  it("SKU page does not render duplicate generic page identity", () => {
    const source = read("src/app/(backend)/admin/variant/page.tsx");
    assert.doesNotMatch(source, /<h1[^>]*>\s*Quản lý SKU\s*<\/h1>/);
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /<h2>\s*Danh sách SKU\s*<\/h2>/);
    assert.match(source, /VariantForm/);
  });

  it("content reviews list does not render duplicate page identity", () => {
    const source = read("src/components/admin/content/ContentReviewsClient.tsx");
    assert.doesNotMatch(source, /<h1[^>]*>\s*Kiểm duyệt nội dung\s*<\/h1>/);
    assert.doesNotMatch(source, /admin-page-title/);
    assert.match(source, /Gán cho tôi/);
    assert.match(source, /Làm mới/);
    assert.match(source, /href=\{primaryHref\}/);
  });

  it("content publishing does not render duplicate page identity", () => {
    const source = read("src/components/admin/content/ContentPublishingDashboardClient.tsx");
    assert.doesNotMatch(source, /<h1[^>]*>\s*Xuất bản nội dung\s*<\/h1>/);
    assert.doesNotMatch(source, /admin-page-title/);
    assert.match(source, /Làm mới/);
    assert.match(source, /title: "Ready"/);
    assert.match(source, /title: "Scheduled"/);
  });

  it("content review detail delegates page identity to the admin shell", () => {
    const source = read("src/components/admin/content/ContentReviewDetailClient.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /<AdminPageTitle title=\{reviewLabel\} \/>/);
    assert.match(source, /<StatusBadge tone=\{reviewStatusTone\(session\.status\)\}>/);
    assert.match(source, /AdminLoadingButton|post\(/);
  });

  it("does not alter navigation or breadcrumb authority registries", () => {
    const nav = read("src/lib/admin/admin-navigation.ts");
    const crumbs = read("src/lib/admin/admin-breadcrumbs.ts");
    assert.match(nav, /KNOWLEDGE & AI/);
    assert.match(crumbs, /KNOWLEDGE & AI/);
    assert.doesNotMatch(nav, /Tri thức/);
    assert.doesNotMatch(crumbs, /Tri thức/);
  });

  it("does not modify AdminShell page-identity ownership files in this sprint", () => {
    // Contract: IA-3B only touches module pages; these files must remain unstaged/unchanged by intent.
    // Verified by presence of shell h1 ownership still documented in AdminShell source.
    const shell = read("src/components/admin/AdminShell.tsx");
    assert.match(shell, /pageTitle/);
    assert.match(shell, /getAdminBreadcrumbMeta/);
    assert.match(shell, /<h1 className=\{styles\.title\}>\{pageTitle\}<\/h1>/);
  });
});
