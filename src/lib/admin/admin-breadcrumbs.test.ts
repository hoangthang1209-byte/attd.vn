import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  adminDashboardNavItem,
  adminNavigationSections,
} from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";

const APPROVED_DOMAINS = new Set([
  "Tổng quan",
  "BÁN HÀNG",
  "SẢN PHẨM",
  "KỸ THUẬT",
  "KỸ THUẬT SẢN PHẨM",
  "SẢN XUẤT",
  "CONTENT & SEO",
  "WEBSITE",
  "CẤU HÌNH",
  // Hidden/secondary route breadcrumbs may still use legacy domain labels:
  "ĐẠI LÝ & B2B",
  "MEDIA",
  "KNOWLEDGE & AI",
  "VẬN HÀNH",
  "BÁO CÁO",
  "HỆ THỐNG",
  "Admin",
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

describe("admin breadcrumb lean IA metadata", () => {
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

  it("resolves Media under CẤU HÌNH", () => {
    const meta = getAdminBreadcrumbMeta("/admin/media");
    assert.deepEqual(meta.breadcrumbs, ["CẤU HÌNH", "Media"]);
    assert.equal(meta.title, "Media");
  });

  it("places knowledge routes under KNOWLEDGE & AI breadcrumbs (route-only)", () => {
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-base").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Knowledge Base",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/knowledge-graph").breadcrumbs, [
      "KNOWLEDGE & AI",
      "Knowledge Graph",
    ]);
  });

  it("gives reviews and publishing CONTENT & SEO metadata", () => {
    const reviews = getAdminBreadcrumbMeta("/admin/content/reviews");
    assert.deepEqual(reviews.breadcrumbs, ["CONTENT & SEO", "Kiểm duyệt"]);
    assert.notEqual(reviews.title, "ATTD CMS");

    const publishing = getAdminBreadcrumbMeta("/admin/content/publishing");
    assert.deepEqual(publishing.breadcrumbs, ["CONTENT & SEO", "Xuất bản"]);
  });

  it("lets specific new/detail/edit metadata win over list prefixes", () => {
    const productNew = getAdminBreadcrumbMeta("/admin/products/new");
    assert.deepEqual(productNew.breadcrumbs, ["SẢN PHẨM", "Sản phẩm", "Tạo mới"]);
    assert.equal(productNew.title, "Tạo sản phẩm mới");

    const quoteDetail = getAdminBreadcrumbMeta("/admin/quotes/q_1");
    assert.deepEqual(quoteDetail.breadcrumbs, ["BÁN HÀNG", "Báo giá", "Chi tiết"]);

    const orderNew = getAdminBreadcrumbMeta("/admin/orders/new");
    assert.deepEqual(orderNew.breadcrumbs, ["BÁN HÀNG", "Đơn hàng", "Tạo mới"]);

    const customerDetail = getAdminBreadcrumbMeta("/admin/crm/customers/cus_1");
    assert.deepEqual(customerDetail.breadcrumbs, ["BÁN HÀNG", "Khách hàng", "Chi tiết"]);

    const costing = getAdminBreadcrumbMeta("/admin/pricing/costing");
    assert.deepEqual(costing.breadcrumbs, ["BÁN HÀNG", "Tính giá"]);
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

  it("aligns lean navigation section labels", () => {
    const labels = adminNavigationSections.map((section) => section.label);
    assert.ok(labels.includes("CONTENT & SEO"));
    assert.ok(labels.includes("BÁN HÀNG"));
    assert.ok(labels.includes("CẤU HÌNH"));
    assert.ok(!labels.includes("KNOWLEDGE & AI"));
    assert.ok(!labels.includes("ĐẠI LÝ & B2B"));
    assert.ok(!labels.includes("Tri thức"));
  });

  it("uses WEBSITE / CẤU HÌNH labels for retained hubs", () => {
    assert.equal(getAdminBreadcrumbMeta("/admin/settings/homepage").breadcrumbs[0], "WEBSITE");
    assert.equal(getAdminBreadcrumbMeta("/admin/site-navigation").breadcrumbs[0], "WEBSITE");
    assert.equal(getAdminBreadcrumbMeta("/admin/client-logos").breadcrumbs[0], "WEBSITE");
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/settings/users").breadcrumbs, [
      "CẤU HÌNH",
      "Người dùng",
    ]);
  });
});
