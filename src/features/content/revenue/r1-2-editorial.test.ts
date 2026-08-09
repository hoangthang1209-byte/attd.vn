import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTD_EDITORIAL_VOICE_ID,
  ATTD_EDITORIAL_VOICE_PROMPT_LINES,
  ATTD_REWRITE_ACTIONS_VI,
  buildAttdEditorialVoicePromptBlock,
} from "@/features/content/editorial/attd-editorial-voice";
import {
  buildDefaultBlogCanonical,
  isDefaultBlogCanonical,
  resolveBlogCanonical,
} from "@/features/content/editorial/blog-canonical";
import { runEditorialQa } from "@/features/content/editorial/editorial-qa";
import { READINESS_THRESHOLDS } from "@/features/blog/blog-readiness";
import { extractInlineMediaIdsFromHtml } from "@/features/content/inline-media/inline-media-figure";
import { parseMarkdownBlocks } from "@/features/blog/block-parser";
import {
  R1_BLOG_FABRIC,
  buildR1FabricHtml,
} from "@/features/content/revenue/r1-blog-fabric.content";
import {
  R1_BLOG_FORM,
  buildR1FormHtml,
} from "@/features/content/revenue/r1-blog-form.content";
import {
  R1_BLOG_PRINT,
  buildR1PrintHtml,
} from "@/features/content/revenue/r1-blog-print.content";
import {
  R1_BLOG_XUONG_IN,
  buildR1XuongInHtml,
} from "@/features/content/revenue/r1-blog-xuong-in.content";
import { getWholesaleContent } from "@/lib/wholesaleContent";
import { getCollectionContent } from "@/lib/collectionContent";
import { AI_SECTION_MENU_ACTIONS } from "@/features/content-generation/ux/ai-menu-actions";

const DRAFTS = [
  { meta: R1_BLOG_XUONG_IN, html: buildR1XuongInHtml },
  { meta: R1_BLOG_FABRIC, html: buildR1FabricHtml },
  { meta: R1_BLOG_PRINT, html: buildR1PrintHtml },
  { meta: R1_BLOG_FORM, html: buildR1FormHtml },
] as const;

describe("Sprint R1.2 — Solo editorial engine", () => {
  it("exposes a canonical ATTD editorial voice for prompts and rewrites", () => {
    assert.equal(ATTD_EDITORIAL_VOICE_ID, "attd-editorial-voice-v1");
    assert.match(buildAttdEditorialVoicePromptBlock(), /áo trơn/);
    assert.ok(ATTD_EDITORIAL_VOICE_PROMPT_LINES.some((line) => /blank/i.test(line)));
    assert.ok(ATTD_REWRITE_ACTIONS_VI.voice.includes("ATTD"));
    const labels = AI_SECTION_MENU_ACTIONS.map((a) => a.label);
    assert.ok(labels.includes("Viết tự nhiên hơn"));
    assert.ok(labels.includes("Viết lại theo giọng ATTD"));
    assert.ok(labels.includes("Giải thích thực tế hơn"));
  });

  it("defaults self-referencing canonical and preserves explicit overrides", () => {
    const slug = "regular-hay-oversize-xuong-in-nen-nhap-form-nao";
    const expected = "https://www.attd.vn/blog/regular-hay-oversize-xuong-in-nen-nhap-form-nao";
    assert.equal(buildDefaultBlogCanonical(slug), expected);
    assert.equal(resolveBlogCanonical({ slug, canonicalUrl: null }), expected);
    assert.equal(resolveBlogCanonical({ slug, canonicalUrl: "" }), expected);
    const override = "https://www.attd.vn/blog/custom-canonical";
    assert.equal(resolveBlogCanonical({ slug, canonicalUrl: override }), override);
    assert.equal(isDefaultBlogCanonical(slug, expected), true);
    assert.equal(isDefaultBlogCanonical(slug, override), false);
  });

  it("treats word count as recommendation only (not a hard publish blocker)", () => {
    assert.equal(READINESS_THRESHOLDS.wordCount.required, 0);
    assert.ok(READINESS_THRESHOLDS.wordCount.recommended >= 600);
  });

  it("detects blank terminology, internal debug prose, and unsupported numeric claims", () => {
    const blank = runEditorialQa({
      title: "Test",
      metaTitle: "Test title long enough",
      metaDescription: "Meta description long enough for SEO checks here.",
      canonicalUrl: "https://www.attd.vn/blog/test",
      content: "<p>Chúng tôi bán blank tee cho xưởng in.</p><a href=\"/lien-he\">Liên hệ</a>",
      faqCount: 1,
    });
    assert.equal(blank.checks.find((c) => c.id === "content")?.ok, false);
    assert.ok(blank.details.includes("BLANK_TERMINOLOGY"));

    const debug = runEditorialQa({
      title: "Test",
      metaTitle: "Test title long enough",
      metaDescription: "Meta description long enough for SEO checks here.",
      canonicalUrl: "https://www.attd.vn/blog/test",
      content: "<p>Hub: <a href=\"/ao-thun-tron-si\">x</a>. form form lỗi.</p><a href=\"/lien-he\">Liên hệ</a>",
      faqCount: 1,
    });
    assert.ok(debug.details.includes("INTERNAL_DEBUG_PROSE"));
    assert.ok(debug.details.includes("DUPLICATE_WORD"));

    const claim = runEditorialQa({
      title: "Test",
      metaTitle: "Test title long enough",
      metaDescription: "Meta description long enough for SEO checks here.",
      canonicalUrl: "https://www.attd.vn/blog/test",
      content: "<p>MOQ 50 cho mỗi màu. Giá từ 79k.</p><a href=\"/lien-he\">Liên hệ</a>",
      faqCount: 1,
    });
    assert.equal(claim.checks.find((c) => c.id === "claims")?.ok, false);
  });

  it("keeps media assignment consistency for structured figures", () => {
    for (const draft of DRAFTS) {
      const html = draft.html();
      const ids = extractInlineMediaIdsFromHtml(html);
      const imgs = html.match(/<img\b/gi) || [];
      const blocks = parseMarkdownBlocks(html).filter((b) => b.type === "inline-media");
      assert.equal(imgs.length, 2, draft.meta.slug);
      assert.equal(ids.length, 2, draft.meta.slug);
      assert.equal(blocks.length, 2, draft.meta.slug);
    }
  });

  it("four R1 drafts pass editorial QA and never auto-publish from source", () => {
    for (const draft of DRAFTS) {
      const html = draft.html();
      assert.doesNotMatch(html, /\bblank\b/i);
      assert.doesNotMatch(html, /\bHub:\s*/i);
      assert.doesNotMatch(html, /\bCatalogue:\s*/i);
      assert.doesNotMatch(html, /Chọn nguồn tổng:/i);
      assert.match(html, /blog-cta-block/);
      assert.match(html, /href="\/lien-he"/);
      const qa = runEditorialQa({
        title: draft.meta.title,
        content: html,
        metaTitle: draft.meta.metaTitle,
        metaDescription: draft.meta.metaDescription,
        canonicalUrl: buildDefaultBlogCanonical(draft.meta.slug),
        faqCount: draft.meta.faqJson.length,
      });
      assert.equal(qa.readyForReview, true, draft.meta.slug);
      assert.ok("id" in draft.meta && draft.meta.id, draft.meta.slug);
    }
  });

  it("public R1 landings remain free of blank terminology and fabricated claims", () => {
    for (const slug of ["ao-thun-tron-si", "kho-ao-thun-tron", "nguon-hang-ao-thun-tron"] as const) {
      const page = getWholesaleContent(slug);
      assert.ok(page, slug);
      const blob = [page.seoTitle, page.metaDescription, page.h1, page.heroIntro, page.intro].join("\n");
      assert.doesNotMatch(blob, /\bblank\b/i);
      assert.doesNotMatch(blob, /MOQ\s*[:=]?\s*\d+/i);
    }
    const category = getCollectionContent("ao-thun-tron");
    assert.ok(category);
    assert.doesNotMatch(
      [category.seoTitle, category.metaDescription, category.shortIntro, category.intro].join("\n"),
      /\bblank\b/i,
    );
  });

  it("human publish gate remains: generation is proposal/review only", async () => {
    const { getContentGenerationConfig } = await import(
      "@/features/content-generation/contracts/config"
    );
    const cfg = getContentGenerationConfig();
    // Sprint contract: never silently enable paid OpenAI from this change set.
    assert.notEqual(cfg.provider, "OPENAI");
  });
});
