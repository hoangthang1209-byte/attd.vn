import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePatternImportHeader,
  normalizePatternImportSource,
  splitPatternImportFiles,
} from "./pattern-bulk-import";

describe("pattern bulk import helpers", () => {
  it("normalizes Vietnamese headers for spreadsheet matching", () => {
    assert.equal(normalizePatternImportHeader("Tên rập"), "ten rap");
    assert.equal(normalizePatternImportHeader("Nhà cung cấp"), "nha cung cap");
    assert.equal(normalizePatternImportHeader("Quy tắc nhảy size"), "quy tac nhay size");
  });

  it("accepts common Vietnamese source labels", () => {
    assert.equal(normalizePatternImportSource("Nội bộ"), "INTERNAL");
    assert.equal(normalizePatternImportSource("Phòng rập ngoài"), "EXTERNAL_STUDIO");
    assert.equal(normalizePatternImportSource("Khách hàng"), "CUSTOMER");
    assert.equal(normalizePatternImportSource("Xưởng"), "FACTORY");
  });

  it("splits multiple file names by semicolon or newline", () => {
    assert.deepEqual(
      splitPatternImportFiles("front.dxf; spec.pdf\npreview.png"),
      ["front.dxf", "spec.pdf", "preview.png"],
    );
  });
});
