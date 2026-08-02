import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { parseMarkdownBlocks } from "@/features/blog/block-parser";
import {
  buildInlineMediaFigureHtml,
  extractInlineMediaIdsFromHtml,
} from "@/features/content/inline-media/inline-media-figure";
import {
  parseInlineMediaFigure,
  patchInlineMediaFigureHtml,
} from "@/features/content/inline-media/parse-inline-media-figure";
import { scoreInlineMediaCandidate } from "@/features/content/inline-media/inline-media-scoring";
import type { InlineMediaCandidate } from "@/features/content/inline-media/inline-media.types";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const STREAM = read("src/components/admin/blog-editor/BlogDocumentStream.tsx");
const BLOCK = read("src/components/admin/blog-editor/BlogInlineMediaBlock.tsx");
const SUGGESTION = read("src/components/admin/blog-editor/BlogInlineMediaSuggestion.tsx");
const VISUAL = read("src/components/admin/blog-editor/BlogVisualModeEditor.tsx");
const COMMANDS = read("src/components/admin/blog-editor/editor-commands.ts");
const MOVE = read("src/app/api/content/media-placement/move/route.ts");
const IGNORE = read("src/app/api/content/media-placement/ignore/route.ts");
const PREVIEW = read("src/components/admin/blog-editor/BlogEditorPreview.tsx");

function candidate(partial: Partial<InlineMediaCandidate> & { mediaAssetId: string }): InlineMediaCandidate {
  return {
    url: "https://cdn.example.com/a.jpg",
    thumbnailUrl: null,
    title: "Polo",
    altText: "Áo polo",
    caption: null,
    width: 1200,
    height: 900,
    orientation: "LANDSCAPE",
    seoScore: 80,
    seoReadinessStatus: "READY",
    visibility: "PUBLIC",
    contentSuitabilities: ["BLOG_INLINE"],
    subjectTerms: [],
    useCaseTerms: [],
    industryTerms: [],
    libraryCode: "PRODUCT",
    roleCode: "PRODUCT_MAIN",
    collectionIds: [],
    source: "DISCOVERY",
    bundleSlotType: null,
    ...partial,
  };
}

describe("Sprint 14.3 — inline smart media editor", () => {
  it("1–2. parses accepted figures as inline-media blocks; suggestions are editor-only", () => {
    const figure = buildInlineMediaFigureHtml({
      mediaAssetId: "asset_1",
      url: "https://cdn.example.com/x.jpg",
      altText: "Polo cotton",
      caption: "Chất liệu",
      blockId: "imb_1",
      variant: "WIDE",
    });
    const md = `## Chất liệu vải\n\nĐoạn mở.\n\n${figure}\n\n## FAQ\n\n:::faq\nQ: A?\nA: B\n:::\n`;
    const blocks = parseMarkdownBlocks(md);
    assert.ok(blocks.some((block) => block.type === "inline-media"));
    assert.equal(parseInlineMediaFigure(figure)?.mediaAssetId, "asset_1");
    assert.match(SUGGESTION, /Gợi ý ảnh cho phần này/);
    assert.match(SUGGESTION, /Chèn ảnh/);
    assert.doesNotMatch(PREVIEW, /BlogInlineMediaSuggestion|Gợi ý ảnh cho phần này/);
  });

  it("3–12. toolbar/actions and caption/alt/variant contracts", () => {
    assert.match(BLOCK, /Thay ảnh/);
    assert.match(BLOCK, /Khóa|Mở khóa/);
    assert.match(BLOCK, /Di chuyển lên/);
    assert.match(BLOCK, /Sửa caption/);
    assert.match(BLOCK, /Sửa alt/);
    assert.match(BLOCK, /Xem lý do chọn/);
    assert.match(BLOCK, /onFocus|onMouseEnter/);
    assert.match(BLOCK, /aria-label/);

    const figure = buildInlineMediaFigureHtml({
      mediaAssetId: "m1",
      url: "https://cdn.example.com/a.jpg",
      altText: "Alt gốc",
      caption: "Caption gốc",
      variant: "CONTENT_WIDTH",
      blockId: "imb_x",
    });
    const patched = patchInlineMediaFigureHtml(figure, {
      altText: "Alt mới",
      caption: "Caption mới",
      variant: "FULL_WIDTH",
    });
    assert.match(patched, /alt="Alt mới"/);
    assert.match(patched, /Caption mới/);
    assert.match(patched, /data-inline-variant="FULL_WIDTH"/);
    assert.deepEqual(extractInlineMediaIdsFromHtml(patched), ["m1"]);
  });

  it("13–19. section suggestions + no keystroke planner", () => {
    assert.match(STREAM, /Gợi ý ảnh/);
    assert.match(STREAM, /faq|Câu hỏi thường gặp/i);
    assert.match(VISUAL, /runPlan/);
    assert.doesNotMatch(VISUAL, /useEffect\(\(\) => \{\s*void media\.runPlan/);
    assert.match(COMMANDS, /suggest-image/);
    assert.match(COMMANDS, /goi y anh|gợi ý ảnh/i);
  });

  it("20–25 / 44–48. diversity adjacent role penalty + public-only picker", () => {
    const base = candidate({ mediaAssetId: "a1", roleCode: "PRINTING" });
    const plain = scoreInlineMediaCandidate({
      candidate: base,
      intent: "PRINT_METHOD",
      preferredSlots: ["TECHNIQUE"],
      preferredSuitabilities: ["TECHNIQUE_DETAIL"],
      sectionHeading: "In logo",
      usedMediaIds: new Set(),
      usedCollectionIds: new Map(),
    });
    const adjacent = scoreInlineMediaCandidate({
      candidate: base,
      intent: "PRINT_METHOD",
      preferredSlots: ["TECHNIQUE"],
      preferredSuitabilities: ["TECHNIQUE_DETAIL"],
      sectionHeading: "In logo",
      usedMediaIds: new Set(["other"]),
      usedCollectionIds: new Map(),
      adjacentRoleCodes: new Set(["PRINTING"]),
    });
    assert.ok(adjacent.total < plain.total);
    assert.ok(adjacent.signals.some((signal) => signal.key === "adjacent_role"));

    const picker = read("src/components/admin/blog-editor/BlogInlineMediaPickerDrawer.tsx");
    assert.match(picker, /PUBLIC/);
    assert.match(picker, /is-used|đã dùng/);
  });

  it("26–32 / 49–60. APIs, safety, focus mode, no auto-publish", () => {
    assert.match(MOVE, /contentMediaAssignment/);
    assert.match(IGNORE, /inlineMediaIgnore/);
    assert.match(VISUAL, /focusMode/);
    assert.match(BLOCK, /is-compact|compact/);
    assert.doesNotMatch(VISUAL, /status:\s*"PUBLISHED"/);
    assert.doesNotMatch(MOVE + IGNORE, /openai|embedding|vision/i);
    assert.match(VISUAL, /confirm|Gợi ý ảnh/);
  });
});
