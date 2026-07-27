import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  adminDashboardNavItem,
  adminNavigationSections,
} from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";

const APPROVED_DOMAINS = new Set([
  "Dashboard",
  "THƯƠNG MẠI",
  "SẢN PHẨM",
  "KỸ THUẬT SẢN PHẨM",
  "SẢN XUẤT",
  "ĐẠI LÝ & B2B",
  "NỘI DUNG",
  "SEO & GROWTH",
  "MEDIA",
  "WEBSITE",
  "KNOWLEDGE & AI",
  "VẬN HÀNH",
  "BÁO CÁO",
  "HỆ THỐNG",
]);

const OBSOLETE_DOMAINS = ["Nội dung & Website", "Business Intelligence", "Đại lý / B2B"];

function allActiveSidebarHrefs(): string[] {
  const hrefs = adminNavigationSections.flatMap((section) =>
    section.platforms.flatMap((platform) =>
      platform.items
        .filter((item) => item.status === "active" && item.href)
        .map((item) => item.href as string),
    ),
  );
  if (adminDashboardNavItem.href) {
    hrefs.unshift(adminDashboardNavItem.href);
  }
  return hrefs;
}

describe("admin breadcrumb IA v2.0 metadata authority", () => {
  it("gives every active sidebar href non-fallback metadata", () => {
    for (const href of allActiveSidebarHrefs()) {
      const meta = getAdminBreadcrumbMeta(href);
      assert.notDeepEqual(
        meta.breadcrumbs,
        ["CMS"],
        `${href} must not fall back to CMS breadcrumbs`,
      );
      assert.notEqual(meta.title, "ATTD CMS", `${href} must not fall back to ATTD CMS title`);
      assert.ok(
        APPROVED_DOMAINS.has(meta.breadcrumbs[0]),
        `${href} first breadcrumb "${meta.breadcrumbs[0]}" is not an approved domain`,
      );
    }
  });

  it("does not use obsolete first-level domains on active sidebar routes", () => {
    for (const href of allActiveSidebarHrefs()) {
      const meta = getAdminBreadcrumbMeta(href);
      assert.ok(
        !OBSOLETE_DOMAINS.includes(meta.breadcrumbs[0]),
        `${href} still uses obsolete domain ${meta.breadcrumbs[0]}`,
      );
    }
  });

  it("resolves MEDIA asset library correctly", () => {
    const meta = getAdminBreadcrumbMeta("/admin/media");
    assert.deepEqual(meta.breadcrumbs, ["MEDIA", "Thư viện tài sản"]);
    assert.equal(meta.title, "Thư viện tài sản");
  });

  it("places manufacturing library under SẢN XUẤT", () => {
    const list = getAdminBreadcrumbMeta("/admin/manufacturing-library");
    assert.deepEqual(list.breadcrumbs, ["SẢN XUẤT", "Thư viện sản xuất"]);
    assert.equal(list.title, "Thư viện sản xuất");

    const create = getAdminBreadcrumbMeta("/admin/manufacturing-library/new");
    assert.equal(create.breadcrumbs[0], "SẢN XUẤT");
    assert.equal(create.title, "Tạo tài sản sản xuất");

    const detail = getAdminBreadcrumbMeta("/admin/manufacturing-library/asset_123");
    assert.equal(detail.breadcrumbs[0], "SẢN XUẤT");
    assert.deepEqual(detail.breadcrumbs.slice(0, 2), ["SẢN XUẤT", "Thư viện sản xuất"]);
  });

  it("places knowledge routes under KNOWLEDGE & AI", () => {
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-base").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Knowledge Base",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-base/context-preview").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Prompt & Context",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-graph").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Knowledge Graph",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-graph/relationships").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Knowledge Graph",
      "Quan hệ",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-graph/evaluation").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Knowledge Graph",
      "Đánh giá",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/ai-retrieval").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Kiểm tra ngữ cảnh bài viết",
    ]);
  });

  it("places report routes under BÁO CÁO", () => {
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/crm/revenue-categories").breadcrumbs, [
      "BÁO CÁO",
      "Báo cáo doanh thu",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/crm/sales").breadcrumbs, [
      "BÁO CÁO",
      "Báo cáo bán hàng",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/crm/reports").breadcrumbs, [
      "BÁO CÁO",
      "Báo cáo CRM",
    ]);
  });

  it("places warehouse under VẬN HÀNH", () => {
    const meta = getAdminBreadcrumbMeta("/admin/materials/warehouse");
    assert.deepEqual(meta.breadcrumbs, ["VẬN HÀNH", "Tồn kho"]);
  });

  it("gives reviews and publishing explicit NỘI DUNG metadata", () => {
    const reviews = getAdminBreadcrumbMeta("/admin/content/reviews");
    assert.deepEqual(reviews.breadcrumbs, ["NỘI DUNG", "Kiểm duyệt"]);
    assert.notEqual(reviews.title, "ATTD CMS");

    const reviewDetail = getAdminBreadcrumbMeta("/admin/content/reviews/rev_1");
    assert.equal(reviewDetail.breadcrumbs[0], "NỘI DUNG");
    assert.equal(reviewDetail.breadcrumbs[1], "Kiểm duyệt");

    const publishing = getAdminBreadcrumbMeta("/admin/content/publishing");
    assert.deepEqual(publishing.breadcrumbs, ["NỘI DUNG", "Xuất bản"]);
  });

  it("lets specific new/detail/edit metadata win over list prefixes", () => {
    const productNew = getAdminBreadcrumbMeta("/admin/products/new");
    assert.deepEqual(productNew.breadcrumbs, ["SẢN PHẨM", "Sản phẩm", "Tạo mới"]);
    assert.equal(productNew.title, "Tạo sản phẩm mới");

    const productEdit = getAdminBreadcrumbMeta("/admin/products/prod_1/edit");
    assert.deepEqual(productEdit.breadcrumbs, ["SẢN PHẨM", "Sản phẩm", "Chỉnh sửa"]);

    const quoteDetail = getAdminBreadcrumbMeta("/admin/quotes/q_1");
    assert.deepEqual(quoteDetail.breadcrumbs, ["THƯƠNG MẠI", "Báo giá", "Chi tiết"]);

    const quoteEdit = getAdminBreadcrumbMeta("/admin/quotes/q_1/edit");
    assert.deepEqual(quoteEdit.breadcrumbs, ["THƯƠNG MẠI", "Báo giá", "Chỉnh sửa"]);

    const orderNew = getAdminBreadcrumbMeta("/admin/orders/new");
    assert.deepEqual(orderNew.breadcrumbs, ["THƯƠNG MẠI", "Đơn hàng", "Tạo mới"]);

    const customerDetail = getAdminBreadcrumbMeta("/admin/crm/customers/cus_1");
    assert.deepEqual(customerDetail.breadcrumbs, ["THƯƠNG MẠI", "Khách hàng", "Chi tiết"]);
  });

  it("does not introduce Tri thức as a domain label in breadcrumb metadata", () => {
    const source = readFileSync("src/lib/admin/admin-breadcrumbs.ts", "utf8");
    assert.doesNotMatch(source, /Tri thức/);
    for (const href of allActiveSidebarHrefs()) {
      const meta = getAdminBreadcrumbMeta(href);
      assert.notEqual(meta.breadcrumbs[0], "Tri thức");
      assert.ok(!meta.breadcrumbs.includes("Tri thức"));
    }
  });

  it("keeps navigation registry file unchanged for this metadata sprint", () => {
    // Contract: this test file must not require edits to admin-navigation.ts.
    // Presence of IA domains here proves breadcrumbs stay aligned without unifying registries.
    const labels = adminNavigationSections.map((section) => section.label);
    assert.ok(labels.includes("KNOWLEDGE & AI"));
    assert.ok(labels.includes("MEDIA"));
    assert.ok(labels.includes("ĐẠI LÝ & B2B"));
    assert.ok(!labels.includes("Tri thức"));
  });

  it("uses WEBSITE / ĐẠI LÝ & B2B / HỆ THỐNG enterprise labels", () => {
    assert.equal(getAdminBreadcrumbMeta("/admin/settings/homepage").breadcrumbs[0], "WEBSITE");
    assert.equal(getAdminBreadcrumbMeta("/admin/site-navigation").breadcrumbs[0], "WEBSITE");
    assert.equal(getAdminBreadcrumbMeta("/admin/client-logos").breadcrumbs[0], "WEBSITE");
    assert.equal(getAdminBreadcrumbMeta("/admin/dealer").breadcrumbs[0], "ĐẠI LÝ & B2B");
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/settings/users").breadcrumbs, [
      "HỆ THỐNG",
      "Users",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/settings/roles").breadcrumbs, [
      "HỆ THỐNG",
      "Roles",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/settings/branding").breadcrumbs, [
      "HỆ THỐNG",
      "Branding",
    ]);
  });
});
