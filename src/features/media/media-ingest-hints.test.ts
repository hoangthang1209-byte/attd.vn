import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ingestHintTokensFromRelativePath,
  normalizeIngestRelativePath,
} from "@/features/media/media-ingest-hints";

describe("media ingest hints", () => {
  it("normalizes folder-relative paths", () => {
    assert.equal(normalizeIngestRelativePath("  shoot/polo/front.jpg  "), "shoot/polo/front.jpg");
    assert.equal(normalizeIngestRelativePath("shoot\\qc\\line1.png"), "shoot/qc/line1.png");
  });

  it("extracts hint tokens without treating path as authoritative label", () => {
    const tokens = ingestHintTokensFromRelativePath("2026-03/wrong-name/polo-red.jpg");
    assert.ok(tokens.includes("polo-red"));
    assert.ok(tokens.some((token) => token.includes("wrong")));
  });
});
