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

describe("IA-4E dashboard workspace hierarchy", () => {
  it("main admin dashboard: shell title only; KPIs before quick actions; no local h1", () => {
    const source = read("src/app/(backend)/admin/dashboard/page.tsx");
    assert.match(source, /AdminPageTitle/);
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /admin-dashboard-card/);
    assert.match(source, /CmsHealthCard/);
    assert.match(source, /\/admin\/products/);
    assert.match(source, /\/admin\/media/);
    assert.match(source, /\/admin\/crm/);
    const kpiIdx = indexOfOrThrow(source, "admin-dashboard-grid", "kpi grid");
    const quickIdx = indexOfOrThrow(source, "admin-quick-actions", "quick actions");
    assert.ok(kpiIdx < quickIdx, "primary KPIs should precede quick-action region");
  });

  it("operations dashboard: no duplicate title h2; EmptyState for error/empty; KPIs remain linked", () => {
    const source = read("src/components/admin/operations/OperationsDashboard.tsx");
    assert.doesNotMatch(source, /<h2 className="admin-subtitle">Tổng quan vận hành<\/h2>/);
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /AdminLoadingState/);
    assert.match(source, /EmptyState/);
    assert.match(source, /admin-ops-summary-grid/);
    assert.match(source, /\/admin\/production/);
    assert.match(source, /\/admin\/delivery/);
    assert.match(source, /formatOrderCurrency/);
  });

  it("executive BI dashboard: PageHeader without competing title; KPIs before sections; retry EmptyState", () => {
    const source = read("src/components/admin/bi/ExecutiveDashboard.tsx");
    assert.doesNotMatch(source, /title="Bảng điều khiển điều hành"/);
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /PageHeader/);
    assert.match(source, /admin-catalog-kpi-bar/);
    assert.match(source, /EmptyState/);
    assert.match(source, /tone="error"/);
    assert.match(source, /formatPricingCurrency/);
    assert.match(source, /EXECUTIVE_DASHBOARD_KPI_LABELS/);
    const kpiIdx = indexOfOrThrow(source, "admin-catalog-kpi-bar", "kpi bar");
    const funnelIdx = indexOfOrThrow(source, "EXECUTIVE_SECTION_LABELS.funnel", "funnel section");
    assert.ok(kpiIdx < funnelIdx, "primary KPIs should precede secondary sections");
  });

  it("CRM overview: loading before error; EmptyState on fail; KPIs before activity", () => {
    const source = read("src/components/admin/crm/CrmOverviewDashboard.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /CardGridLoading/);
    assert.match(source, /EmptyState/);
    assert.match(source, /admin-crm-kpi-grid/);
    assert.match(source, /CrmActivityTimeline/);
    assert.match(source, /data\.newLeads/);
    assert.match(source, /data\.activeCustomers/);
    const loadingIdx = indexOfOrThrow(source, "CardGridLoading", "loading");
    const errorIdx = indexOfOrThrow(source, 'tone="error"', "error");
    const kpiIdx = indexOfOrThrow(source, "admin-crm-kpi-grid", "kpi");
    const activityIdx = indexOfOrThrow(source, "Hoạt động gần đây", "activity");
    assert.ok(loadingIdx < errorIdx, "loading branch should precede error branch");
    assert.ok(kpiIdx < activityIdx, "KPIs should precede activity feed");
  });

  it("pricing overview: EmptyState error/empty; KPIs before activity; units remain labeled", () => {
    const source = read("src/components/admin/pricing/PricingOverviewDashboard.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /AdminLoadingState/);
    assert.match(source, /EmptyState/);
    assert.match(source, /formatPricingCurrency/);
    assert.match(source, /Nhóm giá đang hoạt động/);
    assert.match(source, /Thử lại/);
    const kpiIdx = indexOfOrThrow(source, "admin-catalog-kpi-bar", "kpi");
    const recentIdx = indexOfOrThrow(source, "Bản tính giá gần đây", "recent");
    assert.ok(kpiIdx < recentIdx);
  });

  it("product summary: loading KPIs use dash not zero; list IA-4C markers remain", () => {
    const source = read("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /kpiValue/);
    assert.match(source, /loading \? "—"/);
    assert.match(source, /aria-busy=\{loading\}/);
    assert.match(source, /TableLoading/);
    assert.match(source, /EmptyState/);
    assert.match(source, /Chưa có sản phẩm/);
    assert.match(source, /Không tìm thấy sản phẩm phù hợp/);
    assert.match(source, /product-workspace-toolbar/);
    assert.match(source, /product-admin-summary-grid/);
  });

  it("SEO dashboard: filters/actions before metrics; EmptyState with retry; responsive grid", () => {
    const source = read("src/components/admin/seo-content/SeoDashboardClient.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /AdminPageTitle/);
    assert.match(source, /EmptyState/);
    assert.match(source, /Thử lại/);
    assert.match(source, /admin-catalog-kpi-bar/);
    assert.match(source, /auto-fit, minmax\(260px/);
    assert.doesNotMatch(source, /gridTemplateColumns: "1fr 1fr"/);
    const actionsIdx = indexOfOrThrow(source, "Chiến lược SEO", "actions");
    const kpiIdx = indexOfOrThrow(source, "admin-catalog-kpi-bar", "kpi");
    assert.ok(actionsIdx < kpiIdx, "secondary nav actions should precede KPI metrics");
  });

  it("content publishing: queue empty copy clarified; global empty and loading intact", () => {
    const source = read("src/components/admin/content/ContentPublishingDashboardClient.tsx");
    assert.doesNotMatch(source, /<h1\b/);
    assert.match(source, /AdminLoadingState/);
    assert.match(source, /EmptyState/);
    assert.match(source, /Không có mục trong hàng đợi/);
    assert.match(source, /Không có nội dung trong hàng đợi xuất bản/);
    assert.match(source, /Ready \/ Draft governed/);
    assert.doesNotMatch(source, />Trống</);
  });

  it("does not regress IA-4D/4C/4B/4A/3B authority markers", () => {
    assert.match(
      read("src/components/admin/tech-pack/TechPackDetailManager.tsx"),
      /<h2 className="tech-pack-workspace__title">/,
    );
    assert.match(
      read("src/components/admin/patterns/PatternDetailManager.tsx"),
      /<h2 className="pattern-workspace__title">/,
    );
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

  it("leaves deferred execution dashboards unmodified in this sprint", () => {
    const production = read("src/components/admin/production-planning/ProductionDashboardManager.tsx");
    assert.match(production, /<h1/);
    const kg = read("src/components/admin/knowledge-graph/KnowledgeGraphDashboardClient.tsx");
    assert.match(kg, /Loading…/);
  });
});
