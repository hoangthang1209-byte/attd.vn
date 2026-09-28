import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import QuoteDocumentItemsTable from "./QuoteDocumentItemsTable";
import type { PublicQuoteDocument } from "@/features/quotes/types";

const baseItem: PublicQuoteDocument["items"][number] = {
  designImageUrl: null,
  colorSnapshot: null,
  categorySnapshot: null,
  genderSnapshot: null,
  productNameSnapshot: "Hoodie",
  variantNameSnapshot: null,
  skuSnapshot: null,
  description: "Nỉ 350gsm",
  moqSnapshot: null,
  itemNote: null,
  productionLeadTime: null,
  sampleFee: null,
  sampleLeadTime: null,
  quantity: 100,
  unit: "cái",
  unitPrice: 350000,
  lineTotal: 35000000,
};

test("renders multiple products in a five-column quotation, with only real thumbnails", () => {
  const quote = {
    currency: "VND",
    items: [
      { ...baseItem, designImageUrl: "/media/hoodie.jpg" },
      { ...baseItem, productNameSnapshot: "Túi tote", designImageUrl: null },
      { ...baseItem, productNameSnapshot: "Nón", description: "Thêu logo" },
      { ...baseItem, productNameSnapshot: "Áo polo" },
      { ...baseItem, productNameSnapshot: "Áo thun" },
    ],
  } as PublicQuoteDocument;
  const html = renderToStaticMarkup(<QuoteDocumentItemsTable quote={quote} />);
  assert.equal((html.match(/<th(?:\s|>)/g) ?? []).length, 5);
  assert.equal((html.match(/<tr class="quote-table-row"/g) ?? []).length, 5);
  assert.equal((html.match(/class="quote-doc__design-thumb"/g) ?? []).length, 1);
  assert.match(html, /Nỉ 350gsm/);
  assert.match(html, /35\.000\.000/);
  assert.match(html, /data-label="Số lượng"/);
  assert.match(html, /data-label="Đơn giá"/);
  assert.match(html, /data-label="Thành tiền"/);
  assert.doesNotMatch(html, /Chưa có/);
});
