import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import { computeLineDiff, computeWordDiff, htmlToPlainForDiff } from "@/features/content-generation/ux/text-diff";
import {
  DEFAULT_AI_WRITING_PREFERENCES,
  readAiWritingPreferences,
  writeAiWritingPreferences,
} from "@/features/content-generation/ux/ai-writing-preferences";
import { computeSectionQualityChips } from "@/features/content-generation/ux/section-quality";
import { AI_SECTION_MENU_ACTIONS, resolveAiMenuAction, resolveAiMenuInstruction } from "@/features/content-generation/ux/ai-menu-actions";
import { extractProposalDisplay } from "@/features/content-generation/ux/proposal-display";
import { isStreamingEnabled, getStreamingSupport, createStreamingPlaceholder } from "@/features/content-generation/ux/streaming";

// ---------------------------------------------------------------------------
// 1) line diff
// ---------------------------------------------------------------------------

describe("content-generation-16-1: computeLineDiff", () => {
  it("marks unchanged lines as equal", () => {
    const diff = computeLineDiff("dòng một\ndòng hai", "dòng một\ndòng hai");
    assert.equal(diff.length, 2);
    assert.ok(diff.every((line) => line.type === "equal"));
  });

  it("detects an inserted line", () => {
    const diff = computeLineDiff("dòng một", "dòng một\ndòng hai");
    assert.equal(diff.length, 2);
    assert.equal(diff[0].type, "equal");
    assert.equal(diff[1].type, "insert");
    assert.equal(diff[1].proposalText, "dòng hai");
  });

  it("detects a deleted line", () => {
    const diff = computeLineDiff("dòng một\ndòng hai", "dòng một");
    assert.equal(diff.length, 2);
    assert.equal(diff[1].type, "delete");
    assert.equal(diff[1].originalText, "dòng hai");
  });

  it("pairs a delete+insert into a single change line", () => {
    const diff = computeLineDiff("Câu cũ.", "Câu mới.");
    assert.equal(diff.length, 1);
    assert.equal(diff[0].type, "change");
    assert.equal(diff[0].originalText, "Câu cũ.");
    assert.equal(diff[0].proposalText, "Câu mới.");
  });

  it("handles empty original (pure insert) and empty proposal (pure delete)", () => {
    const inserted = computeLineDiff("", "Nội dung mới.");
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0].type, "insert");

    const deleted = computeLineDiff("Nội dung cũ.", "");
    assert.equal(deleted.length, 1);
    assert.equal(deleted[0].type, "delete");
  });
});

describe("content-generation-16-1: computeWordDiff", () => {
  it("produces a word-level change for a short changed phrase", () => {
    const diff = computeWordDiff("MOQ thấp", "MOQ hợp lý");
    const types = diff.map((d) => d.type);
    assert.ok(types.includes("equal"));
    assert.ok(types.includes("change") || types.includes("insert"));
  });
});

// ---------------------------------------------------------------------------
// 2) htmlToPlainForDiff
// ---------------------------------------------------------------------------

describe("content-generation-16-1: htmlToPlainForDiff", () => {
  it("strips tags and keeps text content", () => {
    const html = "<p>Xin chào <strong>bạn</strong>.</p>";
    assert.equal(htmlToPlainForDiff(html), "Xin chào bạn.");
  });

  it("converts block-level closing tags/br into newlines", () => {
    const html = "<p>Đoạn một.</p><p>Đoạn hai.</p>";
    const plain = htmlToPlainForDiff(html);
    assert.equal(plain, "Đoạn một.\nĐoạn hai.");
  });

  it("decodes common HTML entities and returns empty string for empty input", () => {
    assert.equal(htmlToPlainForDiff("<p>A &amp; B</p>"), "A & B");
    assert.equal(htmlToPlainForDiff(""), "");
  });
});

// ---------------------------------------------------------------------------
// 3) ai writing preferences
// ---------------------------------------------------------------------------

describe("content-generation-16-1: ai writing preferences", () => {
  it("returns documented defaults when nothing is stored (no window/localStorage)", () => {
    const prefs = readAiWritingPreferences();
    assert.deepEqual(prefs, DEFAULT_AI_WRITING_PREFERENCES);
    assert.equal(prefs.tone, "professional");
    assert.equal(prefs.length, "medium");
    assert.equal(prefs.audience, "b2b");
    assert.equal(prefs.noFluff, true);
    assert.equal(prefs.language, "vi");
  });

  describe("with a mocked localStorage", () => {
    let store: Map<string, string>;
    let originalWindow: unknown;

    beforeEach(() => {
      store = new Map();
      originalWindow = (globalThis as { window?: unknown }).window;
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
          setItem: (key: string, value: string) => {
            store.set(key, value);
          },
        },
      };
    });

    afterEach(() => {
      (globalThis as { window?: unknown }).window = originalWindow;
    });

    it("persists a partial update and reads it back merged with defaults", () => {
      const next = writeAiWritingPreferences({ tone: "direct", noFluff: false });
      assert.equal(next.tone, "direct");
      assert.equal(next.noFluff, false);
      assert.equal(next.length, "medium");

      const reread = readAiWritingPreferences();
      assert.equal(reread.tone, "direct");
      assert.equal(reread.noFluff, false);
    });

    it("falls back to defaults for a corrupted/unknown stored value", () => {
      store.set("attd.editor.ai.tone", "not-a-real-tone");
      const prefs = readAiWritingPreferences();
      assert.equal(prefs.tone, "professional");
    });
  });
});

// ---------------------------------------------------------------------------
// 4) section quality chips
// ---------------------------------------------------------------------------

describe("content-generation-16-1: computeSectionQualityChips", () => {
  it("returns missing/low tones for an empty section", () => {
    const chips = computeSectionQualityChips({});
    const byId = Object.fromEntries(chips.map((c) => [c.id, c]));
    assert.equal(byId.seo.score, null);
    assert.equal(byId.seo.tone, "missing");
    assert.equal(byId.evidence.tone, "missing");
    assert.equal(byId.cta.tone, "missing");
  });

  it("scores evidence higher with more factIds and marks cta/links/media ok when present", () => {
    const chips = computeSectionQualityChips({
      wordCount: 220,
      factIds: ["f1", "f2", "f3"],
      hasCta: true,
      hasLinks: true,
      hasMedia: true,
    });
    const byId = Object.fromEntries(chips.map((c) => [c.id, c]));
    assert.ok((byId.evidence.score ?? 0) > 50);
    assert.equal(byId.evidence.tone, "ok");
    assert.equal(byId.cta.tone, "ok");
    assert.equal(byId["internal-links"].tone, "ok");
    assert.equal(byId.media.tone, "ok");
    assert.equal(byId.seo.tone, "ok");
  });

  it("degrades SEO/readability tone when qaIssues include matching codes", () => {
    const chips = computeSectionQualityChips({
      wordCount: 220,
      qaIssues: [{ code: "SEO_THIN_CONTENT", severity: "WARN" }],
    });
    const byId = Object.fromEntries(chips.map((c) => [c.id, c]));
    assert.notEqual(byId.seo.tone, "ok");
  });

  it("derives hasLinks/hasMedia from html when not explicitly provided", () => {
    const chips = computeSectionQualityChips({ html: '<p>Xem <a href="/x">tại đây</a> và <img src="/y.jpg" /></p>' });
    const byId = Object.fromEntries(chips.map((c) => [c.id, c]));
    assert.equal(byId["internal-links"].tone, "ok");
    assert.equal(byId.media.tone, "ok");
  });
});

// ---------------------------------------------------------------------------
// 5) ai-menu-actions
// ---------------------------------------------------------------------------

describe("content-generation-16-1: ai-menu-actions", () => {
  it("exposes all documented Vietnamese menu actions with correct generation types", () => {
    const expected: Array<[string, string]> = [
      ["draft", "SECTION_DRAFT"],
      ["rewrite", "SECTION_REWRITE"],
      ["shorten", "SECTION_SHORTEN"],
      ["expand", "SECTION_EXPAND"],
      ["tone-change", "SECTION_TONE_CHANGE"],
      ["example", "SECTION_EXAMPLE"],
      ["table", "SECTION_EXPAND"],
      ["faq", "FAQ_SUGGESTION"],
      ["cta", "CTA_SUGGESTION"],
      ["internal-link", "INTERNAL_LINK_SUGGESTION"],
      ["media", "MEDIA_SUGGESTION"],
    ];
    assert.equal(AI_SECTION_MENU_ACTIONS.length, expected.length);
    for (const [id, type] of expected) {
      const action = resolveAiMenuAction(id);
      assert.ok(action, `missing action ${id}`);
      assert.equal(action?.type, type);
    }
  });

  it("resolveAiMenuAction returns null for unknown ids", () => {
    assert.equal(resolveAiMenuAction("not-a-real-action"), null);
  });

  it("'table' action builds a fixed HTML-table instruction", () => {
    const instruction = resolveAiMenuInstruction("table");
    assert.match(instruction ?? "", /bảng/i);
    assert.match(instruction ?? "", /table/i);
  });

  it("'tone-change' action builds an instruction from stored tone preference (defaults to professional)", () => {
    const instruction = resolveAiMenuInstruction("tone-change");
    assert.match(instruction ?? "", /chuyên nghiệp/i);
  });
});

// ---------------------------------------------------------------------------
// 6) proposal-display
// ---------------------------------------------------------------------------

describe("content-generation-16-1: extractProposalDisplay", () => {
  it("extracts a SECTION_DRAFT proposal (html/plain/facts/why)", () => {
    const display = extractProposalDisplay("SECTION_DRAFT", {
      sectionId: "section-1",
      heading: "Tổng quan",
      html: "<p>MOQ tối thiểu 500 pcs.</p>",
      plainText: "MOQ tối thiểu 500 pcs.",
      factIdsUsed: ["fact-1"],
      mediaIdsUsed: [],
      internalLinkIdsUsed: [],
      wordCount: 5,
      warnings: [],
    });
    assert.equal(display.heading, "Tổng quan");
    assert.ok(display.html?.includes("MOQ"));
    assert.deepEqual(display.factIds, ["fact-1"]);
    assert.equal(display.why.length, 1);
    assert.match(display.why[0].label, /fact-1|fact-1…/);
  });

  it("extracts a FAQ_SUGGESTION proposal (dedupes factIds across items)", () => {
    const display = extractProposalDisplay("FAQ_SUGGESTION", {
      items: [
        { question: "MOQ là gì?", answerHtml: "<p>...</p>", factIdsUsed: ["fact-1"] },
        { question: "Giao hàng bao lâu?", answerHtml: "<p>...</p>", factIdsUsed: ["fact-1", "fact-2"] },
      ],
      warnings: [],
    });
    assert.equal(display.items.length, 2);
    assert.deepEqual(display.factIds.slice().sort(), ["fact-1", "fact-2"]);
  });

  it("extracts a MEDIA_SUGGESTION proposal (mediaIds + why reasons)", () => {
    const display = extractProposalDisplay("MEDIA_SUGGESTION", {
      suggestions: [
        { mediaAssetId: "media-1", placement: "INLINE_AFTER", altText: "Ảnh", caption: null, reason: "Minh hoạ quy trình" },
      ],
      warnings: [],
    });
    assert.deepEqual(display.mediaIds, ["media-1"]);
    assert.equal(display.why.length, 1);
    assert.equal(display.why[0].label, "Minh hoạ quy trình");
  });

  it("extracts an INTERNAL_LINK_SUGGESTION proposal (why reasons from link suggestions)", () => {
    const display = extractProposalDisplay("INTERNAL_LINK_SUGGESTION", {
      suggestions: [
        { url: "https://attd.vn/blog/a", anchorText: "OEM áo thun", targetTopicId: null, sectionId: null, reason: "Liên quan chủ đề" },
      ],
      warnings: [],
    });
    assert.equal(display.items.length, 1);
    assert.equal(display.why[0].label, "Liên quan chủ đề");
    assert.equal(display.why[0].sourceLabel, "OEM áo thun");
  });

  it("returns a safe empty display for null/malformed output", () => {
    const display = extractProposalDisplay("SECTION_DRAFT", null);
    assert.equal(display.html, null);
    assert.deepEqual(display.factIds, []);
    assert.deepEqual(display.warnings, []);
  });
});

// ---------------------------------------------------------------------------
// 7) streaming disabled by default
// ---------------------------------------------------------------------------

describe("content-generation-16-1: streaming", () => {
  it("is disabled by default and reports a stable reason", () => {
    assert.equal(isStreamingEnabled(), false);
    assert.deepEqual(getStreamingSupport(), { supported: false, reason: "not_enabled" });
  });

  it("createStreamingPlaceholder returns silent no-op handlers", () => {
    const placeholder = createStreamingPlaceholder();
    assert.doesNotThrow(() => placeholder.onChunk("chunk"));
    assert.doesNotThrow(() => placeholder.onDone());
  });
});

// ---------------------------------------------------------------------------
// 8) no secrets leak from any 16.1 display helper
// ---------------------------------------------------------------------------

describe("content-generation-16-1: no secrets in proposal display helpers", () => {
  it("extractProposalDisplay never echoes an apiKey-shaped field even if present on output", () => {
    const display = extractProposalDisplay("SECTION_DRAFT", {
      sectionId: "section-1",
      heading: "Tổng quan",
      html: "<p>Nội dung.</p>",
      plainText: "Nội dung.",
      factIdsUsed: [],
      mediaIdsUsed: [],
      internalLinkIdsUsed: [],
      wordCount: 2,
      warnings: [],
      apiKey: "sk-super-secret-value",
      providerRawResponse: { authorization: "Bearer sk-super-secret-value" },
    });
    const serialized = JSON.stringify(display);
    assert.ok(!serialized.includes("sk-super-secret-value"));
  });
});
