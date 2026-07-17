import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  confirmOverwriteExistingContent,
  parseTagsInput,
  suggestProductCustomizationNote,
  suggestProductImageAlt,
  suggestProductLongDescription,
  suggestProductSeoDescription,
  suggestProductSeoTitle,
  suggestProductShortDescription,
  suggestProductSizeChartNote,
  suggestProductSpecificationSummary,
  suggestProductTags,
} from "@/features/products/product-content-suggestions";

const base = {
  name: "Áo thun test",
  categoryName: "Áo thun",
  defaultMoq: 50,
  leadTime: "5–10 ngày",
  material: "Cotton",
  supportsPrinting: true,
  supportsOem: true,
  options: [
    {
      name: "Màu sắc",
      slug: "color",
      values: [{ label: "Đen" }, { label: "Trắng" }],
    },
    {
      name: "Kích thước",
      slug: "size",
      values: [{ label: "M" }, { label: "L" }, { label: "XL" }],
    },
  ],
};

describe("product content suggestions", () => {
  it("suggests short description from name/category/mode", () => {
    const text = suggestProductShortDescription(base);
    assert.match(text, /Áo thun test/i);
    assert.match(text, /đồng phục|sự kiện|bán sỉ/i);
    assert.ok(text.split(".").filter(Boolean).length >= 1);
  });

  it("suggests long description without inventing missing specs", () => {
    const text = suggestProductLongDescription({
      name: "Áo thun test",
      categoryName: "Áo thun",
      supportsPrinting: true,
    });
    assert.match(text, /B2B|doanh nghiệp|số lượng lớn/i);
    assert.doesNotMatch(text, /chứng nhận|ISO|công suất nhà máy|bảo hành/i);
    assert.doesNotMatch(text, /Cotton/);
    assert.doesNotMatch(text, /MOQ/);
  });

  it("suggests deduped normalized tags", () => {
    const tags = suggestProductTags({
      ...base,
      useCases: "Đồng phục, đồng phục, Sự kiện",
    });
    assert.ok(tags.length >= 5 && tags.length <= 10);
    const keys = tags.map((t) => t.toLowerCase());
    assert.equal(keys.filter((t) => t === "đồng phục").length, 1);
    assert.ok(tags.some((t) => /in logo/i.test(t)));
  });

  it("suggests SEO title with product name and ATTD brand", () => {
    const title = suggestProductSeoTitle(base);
    assert.match(title, /Áo thun test/);
    assert.match(title, /ATTD/);
    assert.ok(title.length <= 70);
  });

  it("suggests concise B2B SEO description", () => {
    const desc = suggestProductSeoDescription(base);
    assert.match(desc, /ATTD/);
    assert.match(desc, /số lượng lớn|doanh nghiệp/i);
    assert.ok(desc.length <= 160);
  });

  it("suggests image alt from name/category/color", () => {
    const alt = suggestProductImageAlt(base);
    assert.match(alt, /Áo thun test/);
    assert.match(alt, /Đen|Áo thun/);
  });

  it("returns safe generic Vietnamese content with empty source data", () => {
    const short = suggestProductShortDescription({});
    const long = suggestProductLongDescription({});
    const tags = suggestProductTags({});
    const seoTitle = suggestProductSeoTitle({});
    const seoDesc = suggestProductSeoDescription({});
    const alt = suggestProductImageAlt({});
    assert.ok(short.length > 10);
    assert.ok(long.length > 20);
    assert.ok(tags.length >= 5);
    assert.match(seoTitle, /ATTD/);
    assert.match(seoDesc, /ATTD/);
    assert.match(alt, /Sản phẩm/);
  });

  it("does not overwrite existing content without confirmation (empty => allow)", () => {
    assert.equal(confirmOverwriteExistingContent(""), true);
    assert.equal(confirmOverwriteExistingContent("   "), true);
  });

  it("suggests size chart note and customization note from known data", () => {
    const note = suggestProductSizeChartNote({
      sizeChart: {
        enabled: true,
        unit: "cm",
        columns: [{ id: "chest", label: "Ngang ngực" }],
        rows: [{ id: "m", size: "M", values: { chest: "50" } }],
      },
    });
    assert.match(note, /±1–2cm|tham khảo/i);

    const custom = suggestProductCustomizationNote({
      supportsPrinting: true,
      supportsEmbroidery: true,
    });
    assert.ok(custom);
    assert.match(custom!.description, /in|thêu/i);
  });

  it("suggests specification rows only from known facts", () => {
    const rows = suggestProductSpecificationSummary({
      material: "Cotton",
      defaultMoq: 50,
      leadTime: "5 ngày",
    });
    assert.deepEqual(
      rows.map((r) => r.label),
      ["Chất liệu", "MOQ", "Thời gian sản xuất"],
    );
  });

  it("parses removable tags input", () => {
    assert.deepEqual(parseTagsInput("áo thun,  đồng phục, áo thun"), ["áo thun", "đồng phục"]);
  });
});

describe("suggestion buttons in one-screen editor", () => {
  it("renders Gợi ý controls in ProductCatalogForm", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/admin/products/ProductCatalogForm.tsx"),
      "utf8",
    );
    assert.match(source, /Gợi ý/);
    assert.match(source, /suggestProductShortDescription|ProductContentSuggestButton/);
    assert.match(source, /product-content-suggestions/);
  });
});
