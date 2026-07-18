import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProductInput } from "@/features/products/product-admin-input";
import { mergePublicSizeChartIntoMetadata } from "@/features/products/product-size-chart";

const FORM_PATH = join(
  process.cwd(),
  "src/components/admin/products/ProductCatalogForm.tsx",
);

describe("one-screen product admin editor", () => {
  const source = readFileSync(FORM_PATH, "utf8");

  it("renders major sections on one screen without tablist navigation", () => {
    assert.match(source, /data-testid="product-catalog-form-onescreen"/);
    assert.match(source, /id="section-basic"/);
    assert.match(source, /id="section-media"/);
    assert.match(source, /id="section-b2b"/);
    assert.match(source, /id="section-variants"/);
    assert.match(source, /id="section-size-chart"/);
    assert.match(source, /id="section-content"/);
    assert.match(source, /id="section-seo"/);
    assert.doesNotMatch(source, /role="tablist"/);
    assert.doesNotMatch(source, /hidden=\{activeTab !==/);
  });

  it("keeps variant generation and size chart editor available", () => {
    assert.match(source, /ProductCatalogVariantsSection/);
    assert.match(source, /onBeforeMatrixGenerate/);
    assert.match(source, /ProductSizeChartEditor/);
    assert.match(source, /publicSizeChart/);
  });

  it("calls save-options-before-preview and applies persisted option IDs", () => {
    assert.match(source, /onBeforeMatrixGenerate=\{ensureOptionsSavedForMatrix\}/);
    assert.match(source, /async function ensureOptionsSavedForMatrix/);
    assert.match(source, /buildPersistedOptionsPayload/);
    assert.match(source, /buildOptionsFingerprint/);
    assert.match(source, /formRef/);
    assert.match(source, /OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR/);
    assert.match(source, /reloadProductFromServer/);
    assert.match(source, /onMatrixBusyChange=\{setMatrixBusy\}/);
    assert.match(source, /productSaveInProgress=\{saving\}/);
  });

  it("includes size chart and content suggestion controls", () => {
    assert.match(source, /id="section-size-chart"/);
    assert.match(source, /ProductSizeChartEditor/);
    assert.match(source, /ProductContentSuggestButton/);
    assert.match(source, /suggestProductShortDescription/);
    assert.match(source, /suggestProductLongDescription/);
  });

  it("keeps sticky save actions", () => {
    assert.match(source, /admin-catalog-form__sticky-actions/);
    assert.match(source, /Lưu thay đổi/);
    assert.match(source, /product-sticky-save-bar|padding-bottom/);
  });

  it("uses content accordions while keeping suggestion buttons", () => {
    assert.match(source, /admin-catalog-accordion/);
    assert.match(source, /ProductContentSuggestButton/);
    assert.match(source, /product-material-accordion/);
  });
});

describe("size chart / content metadata updates do not remove product options", () => {
  it("publicSizeChart merge preserves unrelated metadata keys and never touches options arrays", () => {
    const merged = mergePublicSizeChartIntoMetadata(
      {
        curatedSalesBadges: ["NEW"],
        productEntry: { mode: "FAST" },
      },
      {
        enabled: true,
        unit: "cm",
        title: "Bảng size",
        columns: [{ id: "chest", label: "Ngang ngực" }],
        rows: [{ id: "m", size: "M", values: { chest: "50" } }],
      },
    );
    assert.deepEqual(merged.curatedSalesBadges, ["NEW"]);
    assert.ok(!("options" in merged));
  });

  it("parseProductInput update with only publicSizeChart omits options", () => {
    const parsed = parseProductInput(
      {
        publicSizeChart: {
          enabled: false,
          unit: "cm",
          title: "Bảng size",
          columns: [],
          rows: [],
        },
      },
      "update",
    );
    assert.equal(parsed.options, undefined);
    assert.ok(parsed.publicSizeChart !== undefined);
  });
});

describe("public size chart section component", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/marketplace/ProductSizeChartSection.tsx"),
    "utf8",
  );

  it("renders Bảng size HTML table", () => {
    assert.match(source, /Bảng size|DEFAULT_SIZE_CHART_TITLE|title/);
    assert.match(source, /<table/);
    assert.match(source, /Đơn vị:/);
    assert.match(source, /mp-pdp-size-chart/);
  });
});
