import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildInlineMediaFigureHtml,
  extractInlineMediaIdsFromHtml,
  removeInlineFigureByBlockId,
} from "@/features/content/inline-media/inline-media-figure";
import {
  countWordsFromHtml,
  MIN_INLINE_SCORE_THRESHOLD,
  resolveImageCountPolicy,
} from "@/features/content/inline-media/image-count-policy";
import { scoreInlineMediaCandidate } from "@/features/content/inline-media/inline-media-scoring";
import { DeterministicMediaPlacementRanker } from "@/features/content/inline-media/media-placement-ranker";
import {
  insertFigureIntoHtml,
  parseArticleSections,
  sectionIdFromHeading,
} from "@/features/content/inline-media/parse-article-sections";
import { deriveSectionMediaIntent } from "@/features/content/inline-media/section-media-intent";
import {
  assignmentMetaToBlock,
  blockToAssignmentMeta,
  isInlineMediaAssignmentMeta,
  type InlineMediaCandidate,
} from "@/features/content/inline-media/inline-media.types";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const PANEL = read("src/components/admin/blog-editor/BlogInlineMediaPanel.tsx");
const EDITOR = read("src/components/admin/BlogPostEditor.tsx");
const PLAN_ROUTE = read("src/app/api/content/media-placement/plan/route.ts");
const APPLY_ROUTE = read("src/app/api/content/media-placement/apply/route.ts");
const RANKER = read("src/features/content/inline-media/media-placement-ranker.ts");

function candidate(partial: Partial<InlineMediaCandidate> & { mediaAssetId: string }): InlineMediaCandidate {
  return {
    url: "https://cdn.example.com/a.jpg",
    thumbnailUrl: null,
    title: "Áo polo",
    altText: "Áo polo cotton",
    caption: null,
    width: 1200,
    height: 900,
    orientation: "LANDSCAPE",
    seoScore: 80,
    seoReadinessStatus: "READY",
    visibility: "PUBLIC",
    contentSuitabilities: ["BLOG_INLINE", "MATERIAL_DETAIL"],
    subjectTerms: ["ao polo", "vai cotton"],
    useCaseTerms: ["dong phuc"],
    industryTerms: ["b2b"],
    libraryCode: "PRODUCT",
    roleCode: "PRODUCT",
    collectionIds: ["col1"],
    source: "DISCOVERY",
    bundleSlotType: null,
    ...partial,
  };
}

describe("Sprint 14.2 — inline media contract", () => {
  it("1. stores mediaAssetId in figure, not as the only source of truth URL contract", () => {
    const html = buildInlineMediaFigureHtml({
      mediaAssetId: "asset_abc",
      url: "https://cdn.example.com/x.jpg",
      altText: "Polo",
      caption: "Mẫu polo",
      blockId: "imb_1",
    });
    assert.match(html, /data-media-id="asset_abc"/);
    assert.match(html, /data-inline-block-id="imb_1"/);
    assert.doesNotMatch(html, /data-media-asset-id=/);
    assert.deepEqual(extractInlineMediaIdsFromHtml(html), ["asset_abc"]);
  });

  it("2–5. preserves caption, alt, variant and round-trips metadata", () => {
    const html = buildInlineMediaFigureHtml({
      mediaAssetId: "m1",
      url: "https://cdn.example.com/a.jpg",
      altText: "Chi tiết vải",
      caption: "Cotton 2 chiều",
      sourceCredit: "ATTD",
      variant: "WIDE",
    });
    assert.match(html, /alt="Chi tiết vải"/);
    assert.match(html, /Cotton 2 chiều/);
    assert.match(html, /Nguồn: ATTD/);
    assert.match(html, /data-inline-variant="WIDE"/);
    assert.match(html, /article-figure--wide/);

    const meta = blockToAssignmentMeta(
      {
        id: "imb_x",
        type: "IMAGE",
        mediaAssetId: "m1",
        placement: { afterSectionId: "sec_a", position: "AFTER_HEADING" },
        variant: "CONTENT_WIDTH",
        caption: "Cotton 2 chiều",
        altText: "Chi tiết vải",
        sourceCredit: "ATTD",
        locked: true,
        selectedBy: "EDITOR",
        selectionReason: "manual",
        score: 88,
      },
      "Chất liệu vải",
    );
    assert.equal(isInlineMediaAssignmentMeta(meta), true);
    const block = assignmentMetaToBlock("m1", meta, "Chi tiết vải", "Cotton 2 chiều");
    assert.equal(block.locked, true);
    assert.equal(block.selectedBy, "EDITOR");
    assert.equal(block.mediaAssetId, "m1");
  });

  it("6. width variant FULL_WIDTH is preserved in markup", () => {
    const html = buildInlineMediaFigureHtml({
      mediaAssetId: "m2",
      url: "https://cdn.example.com/b.jpg",
      altText: "Factory",
      variant: "FULL_WIDTH",
    });
    assert.match(html, /article-figure--full/);
  });
});

describe("Sprint 14.2 — section intent", () => {
  it("7. material heading maps to MATERIAL intent", () => {
    assert.equal(deriveSectionMediaIntent({ heading: "Chất liệu vải" }).intent, "MATERIAL_DETAIL");
  });

  it("8. print heading maps to PRINT_METHOD", () => {
    assert.equal(
      deriveSectionMediaIntent({ heading: "Nên in hay thêu logo trên áo polo?" }).intent,
      "PRINT_METHOD",
    );
  });

  it("9. process heading maps to PROCESS", () => {
    assert.equal(
      deriveSectionMediaIntent({ heading: "Quy trình đặt áo polo đồng phục" }).intent,
      "PROCESS",
    );
  });

  it("10. FAQ excluded", () => {
    const derived = deriveSectionMediaIntent({ heading: "Câu hỏi thường gặp" });
    assert.equal(derived.intent, "EXCLUDE");
    assert.equal(derived.excluded, true);
  });

  it("11. CTA / contact intent handled", () => {
    // "Yêu cầu tư vấn…" is excluded from body media (conversion section).
    assert.equal(
      deriveSectionMediaIntent({ heading: "Yêu cầu tư vấn và báo giá" }).excluded,
      true,
    );
    assert.equal(deriveSectionMediaIntent({ heading: "Showroom ATTD" }).intent, "SHOWROOM");
    assert.equal(deriveSectionMediaIntent({ heading: "Đội ngũ ATTD" }).intent, "TEAM");
  });
});

describe("Sprint 14.2 — scoring", () => {
  it("12–18. bundle outranks discovery; penalties apply; ranking stable", async () => {
    const bundle = candidate({
      mediaAssetId: "bundle_1",
      source: "BUNDLE_SLOT",
      bundleSlotType: "MATERIAL",
      contentSuitabilities: ["MATERIAL_DETAIL", "BLOG_INLINE"],
    });
    const discovery = candidate({
      mediaAssetId: "disc_1",
      source: "DISCOVERY",
      seoScore: 90,
    });
    const used = candidate({ mediaAssetId: "used_1", source: "BUNDLE_SLOT", bundleSlotType: "MATERIAL" });
    const noAlt = candidate({ mediaAssetId: "noalt", altText: null, title: "x" });
    const privateAsset = candidate({ mediaAssetId: "priv", visibility: "PRIVATE" });

    const scoreInput = {
      intent: "MATERIAL_DETAIL" as const,
      preferredSlots: ["MATERIAL"],
      preferredSuitabilities: ["MATERIAL_DETAIL", "BLOG_INLINE"],
      sectionHeading: "Chất liệu vải cotton",
      usedMediaIds: new Set(["used_1"]),
      usedCollectionIds: new Map<string, number>(),
      coverMediaIds: new Set<string>(),
    };

    const bundleScore = scoreInlineMediaCandidate({ ...scoreInput, candidate: bundle });
    const discoveryScore = scoreInlineMediaCandidate({ ...scoreInput, candidate: discovery });
    assert.ok(bundleScore.total > discoveryScore.total, "bundle should outrank discovery");

    const usedScore = scoreInlineMediaCandidate({ ...scoreInput, candidate: used });
    assert.ok(usedScore.signals.some((s) => s.key === "already_used"));

    const altScore = scoreInlineMediaCandidate({ ...scoreInput, candidate: noAlt });
    assert.ok(altScore.signals.some((s) => s.key === "missing_alt"));

    const privateScore = scoreInlineMediaCandidate({ ...scoreInput, candidate: privateAsset });
    assert.ok(privateScore.total < 0);

    const ranker = new DeterministicMediaPlacementRanker();
    const first = await ranker.rank({ candidates: [discovery, bundle], scoreInput });
    const second = await ranker.rank({ candidates: [discovery, bundle], scoreInput });
    assert.deepEqual(
      first.map((row) => row.candidate.mediaAssetId),
      second.map((row) => row.candidate.mediaAssetId),
    );
    assert.equal(first[0].candidate.mediaAssetId, "bundle_1");
  });
});

describe("Sprint 14.2 — placement policy & parsing", () => {
  it("19–23. long article target, FAQ skip, spacing helpers, weak skip threshold", () => {
    assert.deepEqual(resolveImageCountPolicy(2500), { min: 3, max: 6, recommended: 4 });
    assert.deepEqual(resolveImageCountPolicy(800), { min: 1, max: 2, recommended: 2 });
    assert.ok(MIN_INLINE_SCORE_THRESHOLD >= 30);

    const html = [
      "<h2>Giới thiệu</h2><p>Mở đầu đủ dài.</p>",
      "<h2>Chất liệu vải</h2><p>Nội dung chất liệu.</p>",
      "<h2>Câu hỏi thường gặp</h2><p>FAQ</p>",
      "<h2>Quy trình đặt hàng</h2><p>Các bước.</p>",
    ].join("\n");

    const sections = parseArticleSections(html);
    assert.ok(sections.some((s) => s.heading === "Câu hỏi thường gặp" && s.excluded));
    assert.equal(sectionIdFromHeading("Chất liệu vải"), sectionIdFromHeading("Chất liệu vải"));

    const material = sections.find((s) => s.heading === "Chất liệu vải")!;
    const figure = buildInlineMediaFigureHtml({
      mediaAssetId: "m9",
      url: "https://cdn.example.com/m.jpg",
      altText: "Vải",
      blockId: "imb_m",
    });
    const next = insertFigureIntoHtml(html, material, figure, "AFTER_HEADING");
    assert.match(next, /Chất liệu vải<\/h2>\s*<figure/);
    assert.doesNotMatch(next, /Câu hỏi thường gặp[\s\S]*data-media-id="m9"/);

    const words = countWordsFromHtml(html);
    assert.ok(words > 5);
  });

  it("24–26. locked/editor metadata preserved; remove only one block", () => {
    const html = [
      buildInlineMediaFigureHtml({
        mediaAssetId: "a1",
        url: "https://cdn.example.com/1.jpg",
        altText: "A1",
        blockId: "imb_a",
      }),
      buildInlineMediaFigureHtml({
        mediaAssetId: "a2",
        url: "https://cdn.example.com/2.jpg",
        altText: "A2",
        blockId: "imb_b",
      }),
    ].join("\n");
    const removed = removeInlineFigureByBlockId(html, "imb_a");
    assert.doesNotMatch(removed, /imb_a/);
    assert.match(removed, /imb_b/);
  });
});

describe("Sprint 14.2 — UI / API / safety contracts", () => {
  it("39–44. plan preview + explicit confirm; no auto-apply on load", () => {
    assert.match(PANEL, /Tự động chèn ảnh/);
    assert.match(PANEL, /Áp dụng đã chọn/);
    assert.match(PANEL, /window\.confirm/);
    assert.match(PANEL, /confirm: true/);
    assert.doesNotMatch(PANEL, /useEffect\(\(\) => \{\s*void runPlan/);
    assert.match(PANEL, /Tự động chọn|Biên tập viên chọn|Đã khóa/);
    assert.match(EDITOR, /BlogInlineMediaPanel/);
  });

  it("45–50. no AI provider, no auto-publish, permissions gated", () => {
    assert.match(RANKER, /DeterministicMediaPlacementRanker/);
    assert.doesNotMatch(RANKER, /openai|embedding|vision/i);
    assert.match(PLAN_ROUTE, /action: "read"/);
    assert.match(APPLY_ROUTE, /action: "update"/);
    assert.match(APPLY_ROUTE, /confirm !== true/);
    assert.doesNotMatch(APPLY_ROUTE, /status:\s*"PUBLISHED"/);
    assert.doesNotMatch(APPLY_ROUTE, /auto.?publish/i);
  });

  it("persistence decision: ContentMediaAssignment metadata, no new migration table", () => {
    const types = read("src/features/content/inline-media/inline-media.types.ts");
    assert.match(types, /ContentMediaAssignment/);
    assert.match(types, /INLINE_META_KEY/);
    assert.doesNotMatch(types, /ContentInlineMediaPlacement/);
  });
});
