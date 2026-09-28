import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import QuoteDocumentNotes from "./QuoteDocumentNotes";

test("shows the preparer as the quotation issuer when one is recorded", () => {
  const html = renderToStaticMarkup(
    <QuoteDocumentNotes quote={{ customerNote: null, terms: "Giao hàng theo thỏa thuận", preparedBy: "Nguyễn Văn An", salesName: "Trần Thị Linh" }} />,
  );
  assert.match(html, /NGƯỜI BÁO GIÁ/);
  assert.match(html, /Nguyễn Văn An/);
  assert.doesNotMatch(html, /Trần Thị Linh/);
  assert.doesNotMatch(html, /Người lập:/);
});

test("uses the sales consultant when the preparer is absent", () => {
  const html = renderToStaticMarkup(
    <QuoteDocumentNotes quote={{ customerNote: null, terms: null, preparedBy: null, salesName: "Trần Thị Linh" }} />,
  );
  assert.match(html, /NGƯỜI BÁO GIÁ/);
  assert.match(html, /Trần Thị Linh/);
});

test("uses the consultant for a blank preparer and omits an unknown issuer", () => {
  const fallback = renderToStaticMarkup(
    <QuoteDocumentNotes quote={{ customerNote: null, terms: null, preparedBy: "  ", salesName: "Trần Thị Linh" }} />,
  );
  assert.match(fallback, /NGƯỜI BÁO GIÁ/);
  assert.match(fallback, /Trần Thị Linh/);

  const unknown = renderToStaticMarkup(
    <QuoteDocumentNotes quote={{ customerNote: null, terms: null, preparedBy: null, salesName: null }} />,
  );
  assert.doesNotMatch(unknown, /NGƯỜI BÁO GIÁ/);
});
