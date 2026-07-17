import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  evaluateProductModePublishRequirements,
  getTemplateVariantAxes,
  listProductTemplatesForMode,
  resolveRecommendedCategoryIds,
  readProductEntryFromMetadata,
  mergeProductEntryIntoMetadata,
  PRODUCT_ENTRY_MODES,
  PRODUCT_ENTRY_TEMPLATES,
} from "@/features/products/product-entry-modes";
import {
  validateFastCreateDraft,
  buildFastCreateDraftPayload,
  canGenerateSkuMatrix,
  resolveFastCreateWarnings,
  FAST_CREATE_ALLOWS_INLINE_CATEGORY_CREATION,
  FAST_CREATE_CATEGORY_SKU_MISSING_WARNING,
  FAST_CREATE_ROUTES,
  previewVariantMatrixCount,
  parseAxisValuesInput,
} from "@/features/products/product-fast-create";
import {
  buildProductSlugFallback,
  buildProductSeoTitleFallback,
  buildProductMetaDescriptionFallback,
  buildProductImageAltFallback,
  resolveProductSeoWithFallback,
} from "@/features/products/product-seo-fallback";
import { buildProductSetupChecklist } from "@/features/products/product-setup-checklist";
import { buildProductSetupChecklistInputFromProduct } from "@/features/products/product-setup-checklist-adapter";
import { evaluateProductPublishQuality } from "@/lib/seo/publish-quality-gate";
import { buildProductAdminEditInitialData } from "@/features/products/product-catalog-form-mappers";
import { normalizeVariantStockFields, isPublicCatalogProductStatus } from "@/features/products/product-foundation-validation";

const repoRoot = resolve(import.meta.dirname, "../../..");
function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

const VALID_DRAFT = {
  name: "Áo thun cotton cổ tròn",
  categoryId: "cat_1",
  productMode: "WHOLESALE_AVAILABLE",
  productTemplateKey: "tshirt",
};

function publishReadyBase() {
  return {
    name: "Áo thun cotton cổ tròn",
    slug: "ao-thun-cotton-co-tron",
    categoryId: "cat_1",
    description: "Áo thun cotton 100% form regular, may kỹ, phù hợp đồng phục doanh nghiệp.",
    seoTitle: "Áo thun cotton cổ tròn | ATTD.vn",
    seoDescription: "Áo thun cotton cổ tròn thuộc nhóm Áo thun. MOQ từ 50. Liên hệ ATTD.vn để được báo giá.",
    featuredImage: "https://cdn.attd.vn/products/ao-thun.jpg",
    variants: [{ variantStatus: "ACTIVE", imageUrl: null }],
  };
}

describe("P0.2A — Revenue Product Entry V1", () => {
  it("1. fast create requires name, category, mode and template", () => {
    assert.equal(validateFastCreateDraft(VALID_DRAFT).valid, true);
    assert.equal(validateFastCreateDraft({ ...VALID_DRAFT, name: "" }).valid, false);
    assert.equal(validateFastCreateDraft({ ...VALID_DRAFT, categoryId: "" }).valid, false);
    assert.equal(validateFastCreateDraft({ ...VALID_DRAFT, productMode: "" }).valid, false);
    assert.equal(validateFastCreateDraft({ ...VALID_DRAFT, productTemplateKey: "" }).valid, false);
  });

  it("2. fast create does not allow inline category creation", () => {
    assert.equal(FAST_CREATE_ALLOWS_INLINE_CATEGORY_CREATION, false);
    const payload = buildFastCreateDraftPayload(VALID_DRAFT) as Record<string, unknown>;
    assert.equal(payload.categoryId, "cat_1");
    assert.equal("createCategory" in payload, false);
  });

  it("3. templates only reference existing category slugs", () => {
    const categories = [{ id: "c-tshirt", slug: "ao-thun-tron" }];
    assert.deepEqual(resolveRecommendedCategoryIds("tshirt", categories), ["c-tshirt"]);
    assert.deepEqual(resolveRecommendedCategoryIds("hoodie", categories), []);
    for (const template of PRODUCT_ENTRY_TEMPLATES) {
      for (const slug of template.recommendedCategorySlugs) {
        assert.equal(slug, slug.toLowerCase());
      }
    }
  });

  it("4. template selection suggests expected variant axes", () => {
    assert.deepEqual(getTemplateVariantAxes("tshirt").map((a) => a.kind), ["COLOR", "SIZE"]);
    assert.deepEqual(getTemplateVariantAxes("drinkware").map((a) => a.kind), ["COLOR", "CAPACITY"]);
    assert.deepEqual(getTemplateVariantAxes("no-variant"), []);
  });

  it("5. category missing skuCode warns but still allows draft save", () => {
    assert.deepEqual(resolveFastCreateWarnings({ id: "c", skuCode: null }), [
      FAST_CREATE_CATEGORY_SKU_MISSING_WARNING,
    ]);
    assert.equal(validateFastCreateDraft(VALID_DRAFT).valid, true);
  });

  it("6. category missing skuCode blocks automated SKU/matrix generation", () => {
    assert.equal(canGenerateSkuMatrix({ id: "c", skuCode: null }), false);
    assert.equal(canGenerateSkuMatrix({ id: "c", skuCode: "TSRG" }), true);
  });

  it("7. slug/SEO/meta/alt fallback are generated deterministically", () => {
    const input = {
      name: "Áo Polo Cá Sấu",
      categoryName: "Áo polo",
      productMode: "MADE_TO_ORDER",
      defaultMoq: 50,
      leadTime: "7-12 ngày",
    };
    assert.equal(buildProductSlugFallback(input.name), "ao-polo-ca-sau");
    assert.equal(buildProductSeoTitleFallback(input), "Áo Polo Cá Sấu - Áo polo | ATTD.vn");
    assert.equal(buildProductImageAltFallback(input), "Áo Polo Cá Sấu - Áo polo");
    const meta = buildProductMetaDescriptionFallback(input);
    assert.equal(meta, buildProductMetaDescriptionFallback(input));
  });

  it("8. publish gate accepts generated SEO fallback when manual SEO is blank", () => {
    const base = publishReadyBase();
    const seo = resolveProductSeoWithFallback({
      name: base.name,
      categoryName: "Áo thun",
      productMode: "WHOLESALE_AVAILABLE",
      defaultMoq: 50,
      leadTime: "7-10 ngày",
      manualSeoTitle: "",
      manualSeoDescription: "",
    });
    const result = evaluateProductPublishQuality({
      ...base,
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
    });
    assert.equal(result.valid, true, JSON.stringify(result.issues));
  });

  it("9. publish gate is mode-aware", () => {
    assert.equal(evaluateProductPublishQuality(publishReadyBase()).valid, true);
    const oem = evaluateProductPublishQuality({ ...publishReadyBase(), productMode: "OEM_SOURCING" });
    assert.equal(oem.valid, false);
    const oemOk = evaluateProductPublishQuality({
      ...publishReadyBase(),
      productMode: "OEM_SOURCING",
      quoteCtaEnabled: true,
    });
    assert.equal(oemOk.valid, true);
  });

  it("10. legacy price fields are not required in fast-create", () => {
    const payload = buildFastCreateDraftPayload(VALID_DRAFT) as Record<string, unknown>;
    assert.equal("wholesalePrice" in payload, false);
    assert.equal("dealerPrice" in payload, false);
  });

  it("11. stocked vs made-to-order have different publish requirements", () => {
    const stocked = evaluateProductModePublishRequirements({ productMode: "WHOLESALE_AVAILABLE" });
    assert.ok(stocked.some((i) => i.field === "pricingMode"));
    assert.ok(stocked.some((i) => i.field === "stockMode"));
    const mto = evaluateProductModePublishRequirements({ productMode: "MADE_TO_ORDER" });
    assert.ok(mto.some((i) => i.field === "defaultMoq"));
    assert.ok(mto.some((i) => i.field === "leadTime"));
  });

  it("12. zero-stock variants remain OUT_OF_STOCK", () => {
    assert.equal(normalizeVariantStockFields(0, "IN_STOCK").stockStatus, "OUT_OF_STOCK");
  });

  it("13. no accidental publish from fast-create (always DRAFT)", () => {
    assert.equal(buildFastCreateDraftPayload(VALID_DRAFT).status, "DRAFT");
  });

  it("14. existing product edit mapping still works and surfaces entry meta", () => {
    const metadata = mergeProductEntryIntoMetadata(null, {
      mode: "MADE_TO_ORDER",
      templateKey: "hoodie",
    });
    const initial = buildProductAdminEditInitialData({
      id: "p1",
      slug: "ao-hoodie-zip",
      name: "Áo hoodie zip",
      productCode: "HD0001",
      categoryId: "cat_1",
      shortDescription: "",
      description: "Mô tả",
      material: null,
      form: null,
      fit: null,
      defaultMoq: 30,
      leadTime: "10-15 ngày",
      useCases: [],
      targetCustomers: [],
      supportsPrinting: true,
      supportsEmbroidery: false,
      supportsOem: false,
      tags: [],
      status: "DRAFT",
      featuredImage: null,
      gallery: [],
      specifications: [],
      attributeAssignments: [],
      customizationCapabilities: [],
      options: [],
      variants: [],
      seoTitle: null,
      seoDescription: null,
      metadata,
    });
    assert.equal(initial.name, "Áo hoodie zip");
    assert.equal(initial.productMode, "MADE_TO_ORDER");
    assert.equal(initial.productTemplateKey, "hoodie");
  });
});

describe("P0.2A acceptance hardening", () => {
  it("navigation exposes only the canonical draft-starter create route", () => {
    const dashboard = readRepoFile("src/components/admin/products/ProductCatalogDashboard.tsx");
    assert.ok(dashboard.includes("Tạo sản phẩm mới"));
    assert.ok(dashboard.includes('href="/admin/products/new"'));
    assert.equal(dashboard.includes("Tạo nhanh sản phẩm"), false);
    assert.equal(dashboard.includes("/admin/products/new/fast"), false);
    const newPage = readRepoFile("src/app/(backend)/admin/products/new/page.tsx");
    assert.ok(newPage.includes("Tạo sản phẩm mới"));
    assert.ok(newPage.includes("ProductDraftStarter"));
    assert.ok(!newPage.includes("<ProductCatalogForm"));
    const fastPage = readRepoFile("src/app/(backend)/admin/products/new/fast/page.tsx");
    assert.ok(fastPage.includes('redirect("/admin/products/new")'));
    assert.equal(fastPage.includes("ProductFastCreateWizard"), false);
    assert.equal(FAST_CREATE_ROUTES.advanced, "/admin/products/new");
  });

  it("old products without metadata.productEntry get graceful checklist", () => {
    const input = buildProductSetupChecklistInputFromProduct({
      name: "Sản phẩm cũ",
      slug: "san-pham-cu",
      shortDescription: null,
      description: "Mô tả đủ dài cho xuất bản sản phẩm cũ trong hệ thống.",
      categoryId: "cat_1",
      category: { skuCode: "TSRG" },
      featuredImage: "https://cdn.attd.vn/p.jpg",
      gallery: [],
      images: [],
      variants: [],
      specifications: [],
      attributeAssignments: [],
      options: [],
      defaultMoq: null,
      leadTime: null,
      seoTitle: "SEO cũ",
      seoDescription: "Mô tả SEO cũ đủ dài cho checklist.",
      metadata: null,
    });
    assert.equal(input.productMode, null);
    assert.equal(input.productTemplateKey, null);
    const checklist = buildProductSetupChecklist(input);
    const basic = checklist.find((g) => g.key === "basic");
    const modeItem = basic?.items.find((i) => i.key === "productMode");
    assert.equal(modeItem?.status, "optional");
  });

  it("each product mode filters templates correctly", () => {
    for (const mode of PRODUCT_ENTRY_MODES) {
      const templates = listProductTemplatesForMode(mode.key);
      assert.ok(templates.length > 0, mode.key);
      for (const template of templates) {
        assert.ok(template.compatibleModes.includes(mode.key), `${mode.key} / ${template.key}`);
      }
    }
  });

  it("variant matrix preview count is accurate", () => {
    assert.equal(previewVariantMatrixCount([["Đen", "Trắng"], ["S", "M", "L"]]), 6);
    assert.equal(previewVariantMatrixCount([parseAxisValuesInput("Đen, Trắng"), parseAxisValuesInput("S, M")]), 4);
    assert.equal(previewVariantMatrixCount([]), 0);
  });

  it("hidden category shows admin warning but does not block draft validation", () => {
    const warnings = resolveFastCreateWarnings({ id: "c", skuCode: "TSRG", isPublic: false });
    assert.ok(warnings.some((w) => w.includes("ẩn khỏi website")));
    assert.equal(validateFastCreateDraft(VALID_DRAFT).valid, true);
  });

  it("DRAFT products are not publicly visible", () => {
    assert.equal(isPublicCatalogProductStatus("DRAFT"), false);
    assert.equal(isPublicCatalogProductStatus("ACTIVE"), true);
  });

  it("fast-create route is retired and no longer mounts the wizard", () => {
    const fastPage = readRepoFile("src/app/(backend)/admin/products/new/fast/page.tsx");
    assert.ok(fastPage.includes('redirect("/admin/products/new")'));
    assert.equal(fastPage.includes("ProductFastCreateWizard"), false);
    const starter = readRepoFile("src/components/admin/products/ProductDraftStarter.tsx");
    assert.equal(starter.includes("Tạo nhanh sản phẩm"), false);
  });

  it("metadata round-trip preserves curated badges alongside productEntry", () => {
    const merged = mergeProductEntryIntoMetadata(
      { curatedSalesBadges: ["NEW"] },
      { mode: "GIFT_MERCHANDISE", templateKey: "drinkware" },
    );
    assert.deepEqual(merged.curatedSalesBadges, ["NEW"]);
    const entry = readProductEntryFromMetadata(merged);
    assert.equal(entry.mode, "GIFT_MERCHANDISE");
    assert.equal(entry.templateKey, "drinkware");
  });
});
