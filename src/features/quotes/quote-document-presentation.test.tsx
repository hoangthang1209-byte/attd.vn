import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import QuoteDocumentItemsTable from "@/components/quotes/QuoteDocumentItemsTable";
import QuoteDocumentSampleInfo from "@/components/quotes/QuoteDocumentSampleInfo";
import { QuotePartyColumns } from "@/components/quotes/QuoteDocumentSections";
import type { PublicQuoteDocument } from "@/features/quotes/types";

const item = {
  designImageUrl: null,
  productNameSnapshot: "Hoodie",
  variantNameSnapshot: null,
  description: "Cotton 400 GSM; in logo trước ngực",
  colorSnapshot: null,
  categorySnapshot: null,
  genderSnapshot: null,
  skuSnapshot: null,
  moqSnapshot: null,
  itemNote: null,
  productionLeadTime: "20 ngày",
  quantity: 1000,
  unit: "cái",
  unitPrice: 350000,
  lineTotal: 350000000,
  sampleFee: null,
  sampleLeadTime: null,
};

describe("customer-facing quote HTML", () => {
  it("renders a readable five-column summary with product specifications", () => {
    const quote = { currency: "VND", priceVatType: "EXCLUDING_VAT", items: [item] } as PublicQuoteDocument;
    const html = renderToStaticMarkup(<QuoteDocumentItemsTable quote={quote} />);
    assert.equal((html.match(/<th>/g) ?? []).length, 5);
    assert.match(html, /Cotton 400 GSM/);
    assert.match(html, /Sản xuất: 20 ngày/);
    assert.doesNotMatch(html, /Thiết kế/);
  });

  it("hides empty sample details and contact column", () => {
    const sample = renderToStaticMarkup(
      <QuoteDocumentSampleInfo quote={{ sampleFee: null, sampleLeadTime: null, sampleRefundCondition: null, currency: "VND" }} />,
    );
    const parties = renderToStaticMarkup(
      <QuotePartyColumns quote={{ customerCompany: "Imin", customerCode: null, customerTaxCode: null, customerAddress: null, customerCompanyPhone: null, customerCompanyEmail: null, customerContactName: null, customerContactTitle: null, customerContactPhone: null, customerContactEmail: null, salesName: "Linh", salesTitle: null, salesPhone: null, salesEmail: null, salesAddress: null }} />,
    );
    assert.equal(sample, "");
    assert.doesNotMatch(parties, /Người liên hệ/);
    assert.match(parties, /Khách hàng/);
  });
});
