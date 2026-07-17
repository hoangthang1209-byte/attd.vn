import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDraftStarterPayload,
  validateDraftStarter,
} from "@/features/products/product-draft-starter";

function readRepoFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("product draft starter", () => {
  it("requires name and category only", () => {
    assert.equal(validateDraftStarter({}).valid, false);
    assert.equal(
      validateDraftStarter({ name: "Áo thun test", categoryId: "cat_1" }).valid,
      true,
    );
  });

  it("builds DRAFT payload for create API", () => {
    const payload = buildDraftStarterPayload({
      name: "Áo thun regular attd 001",
      categoryId: "cat_1",
      categoryName: "Áo Thun Regular",
      productMode: "WHOLESALE_AVAILABLE",
    });
    assert.equal(payload.status, "DRAFT");
    assert.equal(payload.categoryId, "cat_1");
    assert.ok(payload.slug.includes("ao-thun"));
    assert.ok(payload.seoTitle.includes("Áo thun regular attd 001"));
    assert.equal(
      (payload.metadata.productEntry as { mode?: string } | undefined)?.mode,
      "WHOLESALE_AVAILABLE",
    );
  });
});

describe("new product route uses draft starter not full create form", () => {
  it("/admin/products/new renders ProductDraftStarter", () => {
    const newPage = readRepoFile("src/app/(backend)/admin/products/new/page.tsx");
    assert.match(newPage, /ProductDraftStarter/);
    assert.match(newPage, /Tạo sản phẩm mới/);
    assert.doesNotMatch(newPage, /<ProductCatalogForm\s*\/>/);
  });

  it("dashboard has one primary create CTA and no fast create", () => {
    const dashboard = readRepoFile("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.match(dashboard, /Tạo sản phẩm mới/);
    assert.match(dashboard, /href="\/admin\/products\/new"/);
    assert.doesNotMatch(dashboard, /Tạo nhanh sản phẩm/);
    assert.doesNotMatch(dashboard, /\/admin\/products\/new\/fast/);
  });

  it("/admin/products/new/fast redirects to canonical new page", () => {
    const fastPage = readRepoFile("src/app/(backend)/admin/products/new/fast/page.tsx");
    assert.match(fastPage, /redirect\("\/admin\/products\/new"\)/);
    assert.doesNotMatch(fastPage, /ProductFastCreateWizard/);
  });

  it("draft starter redirects to edit after create and has no fast create link", () => {
    const starter = readRepoFile("src/components/admin/products/ProductDraftStarter.tsx");
    assert.match(starter, /buildDraftStarterPayload/);
    assert.match(starter, /Tạo nháp và tiếp tục/);
    assert.match(starter, /router\.push\(`\/admin\/products\/\$\{saved\.id\}\/edit`\)/);
    assert.doesNotMatch(starter, /ProductCatalogForm/);
    assert.doesNotMatch(starter, /Tạo nhanh sản phẩm/);
    assert.doesNotMatch(starter, /\/admin\/products\/new\/fast/);
  });

  it("edit page remains one-screen editor with size chart, suggestions, matrix", () => {
    const editPage = readRepoFile("src/app/(backend)/admin/products/[id]/edit/page.tsx");
    assert.match(editPage, /ProductCatalogForm/);
    const form = readRepoFile("src/components/admin/products/ProductCatalogForm.tsx");
    assert.match(form, /product-catalog-form-onescreen/);
    assert.match(form, /section-size-chart/);
    assert.match(form, /ProductContentSuggestButton/);
    assert.match(form, /ProductCatalogVariantsSection/);
    assert.match(form, /onBeforeMatrixGenerate=\{ensureOptionsSavedForMatrix\}/);
    assert.match(form, /Gợi ý/);
  });
});
