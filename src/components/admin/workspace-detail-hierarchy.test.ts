import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("IA-4D detail workspace hierarchy", () => {
  it("tech pack and pattern demote entity title to h2 and use EmptyState on load miss", () => {
    const tech = read("src/components/admin/tech-pack/TechPackDetailManager.tsx");
    const pattern = read("src/components/admin/patterns/PatternDetailManager.tsx");
    assert.doesNotMatch(tech, /<h1\b/);
    assert.match(tech, /<h2 className="tech-pack-workspace__title">/);
    assert.match(tech, /EmptyState/);
    assert.match(tech, /AdminPageTitle/);
    assert.doesNotMatch(pattern, /<h1\b/);
    assert.match(pattern, /<h2 className="pattern-workspace__title">/);
    assert.match(pattern, /EmptyState/);
    assert.match(pattern, /AdminPageTitle/);
    assert.match(pattern, /Xóa rập/);
    assert.match(pattern, /AdminLoadingButton/);
    const saveIdx = pattern.indexOf("Đang lưu rập");
    const deleteIdx = pattern.indexOf("Xóa rập");
    assert.ok(saveIdx >= 0 && deleteIdx >= 0);
    assert.ok(saveIdx < deleteIdx, "Save should precede destructive delete in action cluster");
  });

  it("production master detail uses shell title + meta PageHeader without competing h1", () => {
    const source = read("src/components/admin/production-master/ProductionMasterDetailManager.tsx");
    assert.match(source, /AdminPageTitle/);
    assert.match(source, /EmptyState/);
    assert.match(source, /StatusBadge/);
    assert.doesNotMatch(source, /PageHeader\s*\n\s*title=/);
    assert.match(source, /meta=/);
    assert.match(source, /admin-btn--danger/);
    assert.match(source, /Quay lại/);
    assert.doesNotMatch(source, /<h1\b/);
  });

  it("quote detail uses EmptyState for load errors and keeps commercial actions", () => {
    const source = read("src/components/admin/quotes/QuoteDetailView.tsx");
    assert.match(source, /EmptyState/);
    assert.match(source, /Tải PDF báo giá/);
    assert.match(source, /Sao chép/);
    assert.match(source, /Gửi báo giá/);
    assert.match(source, /admin-btn--danger/);
    assert.match(source, /Đã hủy/);
    assert.doesNotMatch(source, /<h1\b/);
  });

  it("content review preserves moderation actions, queue nav, and no global h1", () => {
    const source = read("src/components/admin/content/ContentReviewDetailClient.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /<h2 className="admin-page-title">Review \{session\.id\.slice\(0, 8\)\}…<\/h2>/);
    assert.match(source, /AdminLoadingState/);
    assert.match(source, /EmptyState/);
    assert.match(source, /StatusBadge/);
    assert.match(source, /\/admin\/content\/reviews/);
    assert.match(source, /Approve|approve|APPROVED/);
    assert.match(source, /Reject|reject|REJECTED/);
    assert.doesNotMatch(source, /Đang tải review…<\/p>/);
  });

  it("customer detail keeps entity h2 and code/status context without page h1", () => {
    const page = read("src/app/(backend)/admin/crm/customers/[id]/page.tsx");
    const view = read("src/components/admin/crm/CrmCustomerDetailView.tsx");
    assert.match(page, /AdminPageTitle title="Khách hàng"/);
    assert.match(view, /<h2>\{customer\.name\}<\/h2>/);
    assert.match(view, /customer\.code/);
    assert.match(view, /CustomerStatusBadge/);
    assert.doesNotMatch(view, /<h1\b/);
  });

  it("material supplier edit sets entity title and EmptyState on load failure", () => {
    const source = read("src/components/admin/materials/MaterialSupplierForm.tsx");
    assert.match(source, /AdminPageTitle/);
    assert.match(source, /EmptyState/);
    assert.match(source, /loadFailed/);
    assert.match(source, /StatusBadge/);
    assert.doesNotMatch(source, /<h1\b/);
  });

  it("product detail remains free of workspace h1 and keeps save/export separation", () => {
    const source = read("src/components/admin/products/ProductCatalogForm.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /Xuất|Nhân bản|Lưu|Publish|Xuất bản|sticky|product-admin/i);
  });

  it("does not regress IA-4C/4B/4A/3B authority markers", () => {
    assert.match(
      read("src/components/admin/content/ContentReviewsClient.tsx"),
      /AdminLoadingState/,
    );
    assert.match(
      read("src/components/admin/crm/CrmCustomersList.tsx"),
      /PageHeader/,
    );
    assert.match(
      read("src/components/admin/products/ProductCatalogDashboard.tsx"),
      /marginBottom:\s*0/,
    );
    assert.match(read("src/lib/admin/admin-navigation.ts"), /KNOWLEDGE & AI/);
    assert.match(read("src/lib/admin/admin-breadcrumbs.ts"), /KNOWLEDGE & AI/);
    assert.match(read("src/components/admin/AdminShell.tsx"), /pageTitle/);
    assert.doesNotMatch(
      read("src/components/admin/orders/OrderListManager.tsx"),
      /<h1[^>]*>\s*Đơn hàng\s*<\/h1>/,
    );
  });
});
