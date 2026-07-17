import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readRepoFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("legacy admin san-pham routes redirect to catalog", () => {
  it("/admin/san-pham redirects to /admin/products", () => {
    const page = readRepoFile("src/app/(backend)/admin/san-pham/page.tsx");
    assert.match(page, /redirect\("\/admin\/products"\)/);
    assert.doesNotMatch(page, /ProductForm/);
    assert.doesNotMatch(page, /getProducts/);
  });

  it("/admin/san-pham/[id] redirects to catalog edit", () => {
    const page = readRepoFile("src/app/(backend)/admin/san-pham/[id]/page.tsx");
    assert.match(page, /redirect\(`\/admin\/products\/\$\{id\}\/edit`\)/);
    assert.doesNotMatch(page, /ProductImageManager/);
    assert.doesNotMatch(page, /ProductEditForm/);
  });

  it("/admin/san-pham/[id]/chinh-sua redirects to catalog edit", () => {
    const page = readRepoFile("src/app/(backend)/admin/san-pham/[id]/chinh-sua/page.tsx");
    assert.match(page, /redirect\(`\/admin\/products\/\$\{id\}\/edit`\)/);
    assert.doesNotMatch(page, /ProductEditForm/);
  });

  it("admin navigation points only at /admin/products", () => {
    const nav = readRepoFile("src/lib/admin/admin-navigation.ts");
    assert.match(nav, /href: "\/admin\/products"/);
    assert.doesNotMatch(nav, /\/admin\/san-pham/);
  });

  it("dashboard create buttons use canonical product routes", () => {
    const dashboard = readRepoFile("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.match(dashboard, /href="\/admin\/products\/new"/);
    assert.match(dashboard, /href="\/admin\/products\/new\/fast"/);
    assert.doesNotMatch(dashboard, /\/admin\/san-pham/);
  });
});
