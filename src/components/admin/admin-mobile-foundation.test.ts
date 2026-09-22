import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Internal Admin Mobile UX Phase 1 foundation", () => {
  it("exports reusable mobile list and action bar primitives", () => {
    const adminUi = read("src/components/admin/AdminUi.tsx");
    const mobileList = read("src/components/admin/AdminMobileList.tsx");
    const actionBar = read("src/components/admin/AdminMobileActionBar.tsx");

    assert.match(adminUi, /AdminListCard/);
    assert.match(adminUi, /AdminResponsiveList/);
    assert.match(adminUi, /AdminMobileActionBar/);
    assert.match(mobileList, /admin-responsive-list__desktop/);
    assert.match(mobileList, /admin-responsive-list__mobile/);
    assert.match(actionBar, /admin-mobile-action-bar/);
  });

  it("globals.css defines mobile list card and action bar responsive rules", () => {
    const globals = read("src/app/globals.css");
    assert.match(globals, /\.admin-list-card/);
    assert.match(globals, /\.admin-mobile-action-bar/);
    assert.match(globals, /\.admin-responsive-list__mobile/);
    assert.match(globals, /admin-page-shell--mobile-actions/);
  });

  it("pilot pages use AdminResponsiveList without duplicating business logic", () => {
    const leads = read("src/components/admin/CrmLeadsManager.tsx");
    const quotes = read("src/components/admin/quotes/QuoteListManager.tsx");
    const products = read("src/components/admin/products/ProductCatalogDashboard.tsx");

    assert.match(leads, /AdminResponsiveList/);
    assert.match(leads, /AdminMobileActionBar/);
    assert.match(leads, /AdminListCard/);
    assert.match(leads, /DataToolbar/);

    assert.match(quotes, /AdminResponsiveList/);
    assert.match(quotes, /AdminMobileActionBar/);

    assert.match(products, /AdminResponsiveList/);
    assert.match(products, /AdminMobileActionBar/);
  });

  it("AdminShell mobile header compacts breadcrumbs and supports safe areas", () => {
    const shellCss = read("src/components/admin/AdminShell.module.css");
    assert.match(shellCss, /safe-area-inset-top/);
    assert.match(shellCss, /safe-area-inset-bottom/);
    assert.match(shellCss, /\.breadcrumbs[\s\S]*display: none/);
  });
});
