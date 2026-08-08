import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  dropEmptyMediaFigures,
  dropLeadingTitleEcho,
  isNonTocHeading,
  promoteBareCtaParagraphs,
  removeInlineFaqSections,
  repairAnchors,
  stripOrphanLinkFragments,
} from "@/features/blog/article-normalize";
import { prepareBlogArticleContent } from "@/features/blog/prepare-content";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const TOC = read("src/components/blog/BlogTableOfContents.tsx");
const FAQ = read("src/components/blog/BlogFaqSection.tsx");
const TAGS = read("src/components/blog/BlogTags.tsx");
const AUTHOR = read("src/components/blog/AuthorBox.tsx");
const IMAGE = read("src/components/blog/ArticleImage.tsx");
const PROGRESS = read("src/components/blog/ArticleReadingProgress.tsx");
const PAGE = read("src/app/(public)/blog/[slug]/page.tsx");
const CSS = read("src/app/globals.css");

/**
 * The exact damage found on the live article: seven opening anchors, no
 * closing tags, so the browser extended each link across the rest of the page.
 */
const BROKEN_FRAGMENT = [
  '<p>Nếu bạn đang so sánh phôi trơn, xem thêm <a href="/ao-polo-tron">áo polo trơn</a> để phân biệt áo trơn.</p>',
  '<h2 id="vi-sao">Vì sao áo polo phù hợp?</h2>',
  "<p>Áo polo giữ vẻ chỉnh chu hơn áo thun cổ tròn.</p>",
  '<p><a href="/lien-he">Chuẩn bị số lượng, đối tượng, môi trường mặc, màu, logo và thời điểm cần nhận để nhận tư vấn báo giá.</p>',
  "<figure><figcaption>ATTD media</figcaption></figure>",
].join("\n");

const anchorCounts = (html: string) => ({
  open: html.match(/<a\b/gi)?.length ?? 0,
  close: html.match(/<\/a>/gi)?.length ?? 0,
});

describe("Sprint 14.1 — public article rendering", () => {
  it("1. leaves a normal paragraph free of anchor markup", () => {
    const { html } = prepareBlogArticleContent("<p>Áo polo giữ vẻ chỉnh chu cho văn phòng.</p>");
    assert.doesNotMatch(html, /<a\b/i);
    assert.match(html, /<p>Áo polo giữ vẻ chỉnh chu cho văn phòng\.<\/p>/);
  });

  it("2. cleans a malformed markdown link fragment", () => {
    const { html, removed } = stripOrphanLinkFragments("<p>ATTD media\n](/lien-he)</p>");
    assert.equal(removed, 1);
    assert.doesNotMatch(html, /\]\(/);
    assert.match(html, /ATTD media/);
  });

  it("3. stops an unclosed anchor from consuming following paragraphs", () => {
    const { html } = prepareBlogArticleContent(BROKEN_FRAGMENT);
    const counts = anchorCounts(html);
    assert.equal(counts.open, counts.close, "anchors must balance");

    // The heading and the paragraph after it must live outside the anchor.
    const firstAnchor = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] ?? "";
    assert.doesNotMatch(firstAnchor, /<h2/i);
    assert.doesNotMatch(firstAnchor, /Áo polo giữ vẻ chỉnh chu/);
  });

  it("4. keeps a valid internal link intact", () => {
    const source = '<p>Xem <a href="/blog/ao-polo">hướng dẫn</a> để biết thêm.</p>';
    const { html } = prepareBlogArticleContent(source);
    assert.match(html, /<a href="\/blog\/ao-polo">hướng dẫn<\/a>/);
    assert.match(html, /để biết thêm\./);
  });

  it("5. renders a bare conversion link as the shared CTA block", () => {
    const source =
      '<p><a href="/lien-he">Chuẩn bị số lượng, đối tượng, môi trường mặc và thời điểm cần nhận để nhận tư vấn báo giá.</a></p>';
    const { promoted, html } = promoteBareCtaParagraphs(source);

    assert.equal(promoted, 1);
    assert.match(html, /class="blog-cta-block"/);
    assert.match(html, /class="blog-cta-block__button" href="\/lien-he"/);
    // A CTA must not become a heading, or it would enter the table of contents.
    assert.doesNotMatch(html, /<h[1-6]/i);
  });

  it("6. leaves no raw ](/lien-he) text anywhere in the output", () => {
    const { html } = prepareBlogArticleContent(BROKEN_FRAGMENT);
    assert.doesNotMatch(html, /\]\(\/lien-he\)/);
    assert.doesNotMatch(html, /\]\(/);
  });

  it("7. leaves no raw markdown heading syntax", () => {
    const { html } = prepareBlogArticleContent("## Chất liệu vải\n\nNội dung đoạn văn.");
    assert.doesNotMatch(html, /^##\s/m);
    assert.match(html, /<h2[^>]*>Chất liệu vải<\/h2>/);
  });

  it("8. emits exactly one H1, and it comes from the page not the body", () => {
    const { html } = prepareBlogArticleContent("<h1>Tiêu đề</h1><h2>Phần</h2><p>Nội dung.</p>");
    assert.equal(html.match(/<h1/gi)?.length ?? 0, 1);

    const pageH1 = PAGE.match(/<h1/g)?.length ?? 0;
    assert.equal(pageH1, 1);
    assert.match(PAGE, /className="blog-article-title"/);
  });

  it("9. builds the TOC hierarchy from H2 and H3", () => {
    const { headings } = prepareBlogArticleContent(
      "<h2>Chất liệu</h2><p>a</p><h3>Cotton</h3><p>b</p><h3>CVC</h3><p>c</p><h2>Quy trình</h2><p>d</p>",
    );

    assert.deepEqual(
      headings.map((heading) => `h${heading.level}:${heading.text}`),
      ["h2:Chất liệu", "h3:Cotton", "h3:CVC", "h2:Quy trình"],
    );
    assert.match(TOC, /function buildGroups/);
    assert.match(TOC, /blog-toc-sublist/);
  });

  it("10. drops duplicated FAQ questions from the body and the TOC", () => {
    const questions = ["Nên in hay thêu logo?"];
    const source = [
      "<h2>Quy trình đặt hàng</h2>",
      "<p>Nội dung.</p>",
      "<h2>Câu hỏi thường gặp</h2>",
      "<h3>Nên in hay thêu logo?</h3>",
      "<p>Thêu phù hợp logo ít màu.</p>",
    ].join("\n");

    const { html, removed } = removeInlineFaqSections(source, questions);
    assert.equal(removed, 1);
    assert.doesNotMatch(html, /Nên in hay thêu logo\?/);

    const prepared = prepareBlogArticleContent(source, { canonicalFaqQuestions: questions });
    assert.deepEqual(
      prepared.headings.map((heading) => heading.text),
      ["Quy trình đặt hàng"],
    );
  });

  it("11. tracks the active section with one IntersectionObserver", () => {
    assert.match(TOC, /new IntersectionObserver/);
    assert.equal(TOC.match(/new IntersectionObserver/g)?.length, 1);
    assert.doesNotMatch(TOC, /addEventListener\(\s*"scroll"/);
    assert.match(TOC, /is-active/);
    assert.match(TOC, /aria-current=\{activeId === /);
    // Emphasis plus a left indicator.
    assert.match(CSS, /\.blog-toc-link\.is-active\s*\{[^}]*border-left-color:\s*var\(--primary\)/);
    assert.match(CSS, /\.blog-toc-link\.is-active\s*\{[^}]*font-weight:\s*600/);
  });

  it("12. collapses the TOC into a disclosure on mobile", () => {
    assert.match(TOC, /aria-expanded=\{mobileOpen\}/);
    assert.match(TOC, /aria-controls="blog-toc-panel"/);
    assert.match(CSS, /@media \(max-width: 960px\)[\s\S]*?\.blog-toc-panel \{\s*display: none/);
    assert.match(CSS, /\.blog-toc-panel--open \{\s*display: block/);
    // Constrained height with internal scrolling.
    assert.match(CSS, /\.blog-toc-list \{[\s\S]*?max-height:[\s\S]*?overflow-y: auto/);
  });

  it("13. renders FAQ content from the same source as the schema", () => {
    assert.match(FAQ, /items\.map/);
    assert.match(FAQ, /\{item\.question\}/);
    assert.match(FAQ, /\{item\.answer\}/);
    // No Q1/A1 decoration in the public UI.
    assert.doesNotMatch(FAQ, /blog-faq-label/);
    assert.doesNotMatch(FAQ, /Q\{index \+ 1\}/);
    // Accessible disclosure semantics without extra JavaScript.
    assert.match(FAQ, /<details/);
    assert.match(FAQ, /<summary/);
    assert.doesNotMatch(FAQ, /"use client"/);

    // Both the visible list and the JSON-LD read parseFaqJson output.
    assert.match(PAGE, /const faqItems = parseFaqJson/);
    assert.match(PAGE, /<FaqSchema items=\{faqItems\} \/>/);
    assert.match(PAGE, /<BlogFaqSection items=\{faqItems\} \/>/);
  });

  it("14. collapses public tags after the configured visible count", () => {
    assert.match(TAGS, /const VISIBLE_TAGS = 5;/);
    assert.match(TAGS, /Xem thêm \{hidden\}/);
    assert.match(TAGS, /ordered\.slice\(0, VISIBLE_TAGS\)/);
    // Human label rather than a run-together hashtag slug.
    assert.doesNotMatch(TAGS, /#\{tagToSlug\(tag\)\}/);
    assert.match(TAGS, /\{tag\}\n\s*<\/Link>/);
    // Stored tags are only reordered, never dropped.
    assert.match(TAGS, /\[\.\.\.tags\]\.sort/);
  });

  it("15. keeps the featured image separate from body images", () => {
    assert.match(PAGE, /className="blog-article-hero"/);
    assert.doesNotMatch(IMAGE, /blog-article-hero/);
    assert.match(IMAGE, /article-figure/);
    // Body images must reserve space and lazy-load below the fold.
    assert.match(IMAGE, /width: number;/);
    assert.match(IMAGE, /height: number;/);
    assert.match(IMAGE, /loading=\{priority \? "eager" : "lazy"\}/);
    assert.match(IMAGE, /if \(!alt\.trim\(\)\) return null;/);
  });

  it("16. renders identically for the public article and the Blog preview", () => {
    const markdown = [
      "## Chất liệu vải",
      "",
      "Xem [hướng dẫn chọn phôi](/blog/ao-polo) trước khi chốt mẫu.",
      "",
      "### Cotton",
      "",
      "Thoáng và dễ mặc.",
    ].join("\n");

    const preview = renderBlogPreviewFromMarkdown(markdown);
    const publicHtml = prepareBlogArticleContent(preview).html;

    assert.equal(preview, publicHtml, "preview and public render must agree");
    assert.match(preview, /<a href="\/blog\/ao-polo">hướng dẫn chọn phôi<\/a>/);

    // Both surfaces call the one shared contract.
    const previewSource = read("src/features/blog/preview-content.ts");
    assert.match(previewSource, /prepareBlogArticleContent/);
    assert.match(PAGE, /prepareBlogArticleContent/);
  });

  it("17. keeps server-rendered article content free of hydration hazards", () => {
    // The body, FAQ and author card render on the server.
    assert.doesNotMatch(FAQ, /"use client"/);
    assert.doesNotMatch(AUTHOR, /"use client"/);
    assert.doesNotMatch(IMAGE, /"use client"/);

    // Client pieces derive their first paint from props, never from Date/random.
    for (const source of [TOC, PROGRESS, TAGS]) {
      assert.doesNotMatch(source, /Date\.now\(\)/);
      assert.doesNotMatch(source, /Math\.random\(\)/);
      assert.doesNotMatch(source, /useState\([^)]*window/);
    }
    // Browser-only reads happen inside effects.
    assert.match(TOC, /useEffect\(/);
    assert.match(PROGRESS, /useEffect\(/);
  });

  it("18. adds no data fetching to the article view", () => {
    for (const source of [TOC, FAQ, TAGS, AUTHOR, PROGRESS, IMAGE]) {
      assert.doesNotMatch(source, /\bfetch\(/);
      assert.doesNotMatch(source, /useSWR|useQuery/);
    }
    // Progress and TOC listen passively rather than per heading.
    assert.match(PROGRESS, /\{ passive: true \}/);
    assert.match(PROGRESS, /requestAnimationFrame/);
  });

  it("19. leaves already-clean articles unchanged", () => {
    const clean = [
      "<h2>Giới thiệu</h2>",
      "<p>Đoạn mở đầu.</p>",
      '<figure data-media-id="m1"><img src="/uploads/a.jpg" alt="A" /></figure>',
      '<p>Tham khảo <a href="/vai-cvc-la-gi">vải CVC</a>.</p>',
      "<h3>Chi tiết</h3>",
      "<p>Nội dung chi tiết.</p>",
    ].join("\n");

    const { html, headings } = prepareBlogArticleContent(clean);

    assert.match(html, /<a href="\/vai-cvc-la-gi">vải CVC<\/a>/);
    assert.match(html, /<img src="\/uploads\/a\.jpg" alt="A" \/>/);
    assert.equal(headings.length, 2);
    const counts = anchorCounts(html);
    assert.equal(counts.open, counts.close);
  });

  it("20. renders the live article fragment without malformed links", () => {
    const { html, headings } = prepareBlogArticleContent(BROKEN_FRAGMENT, {
      canonicalFaqQuestions: [],
    });

    const counts = anchorCounts(html);
    assert.equal(counts.open, counts.close);
    assert.doesNotMatch(html, /\]\(/);
    assert.doesNotMatch(html, /ATTD media/, "unresolved media figure must not render");
    assert.match(html, /class="blog-cta-block"/);
    assert.match(html, /href="\/lien-he"/, "the contact destination must survive");
    assert.deepEqual(
      headings.map((heading) => heading.text),
      ["Vì sao áo polo phù hợp?"],
    );
  });
});

describe("Sprint 14.1 — supporting normalizer behaviour", () => {
  it("flattens nested anchors instead of emitting invalid markup", () => {
    const source = '<p><a href="/a">một <a href="/b">hai</a></p>';
    const { html, unnested } = repairAnchors(source);

    assert.ok(unnested >= 1);
    assert.doesNotMatch(html, /<a\b[^>]*>[^<]*<a\b/);
    assert.equal(anchorCounts(html).open, anchorCounts(html).close);
  });

  it("drops anchors with no href and no text", () => {
    const { html, dropped } = repairAnchors('<p><a>trống</a> và <a href="/x"></a>giữ</p>');
    assert.equal(dropped, 2);
    assert.doesNotMatch(html, /<a\b/);
    assert.match(html, /trống/);
  });

  it("refuses to rewrite unsafe hrefs into anchors", () => {
    const { html } = repairAnchors('<p><a href="javascript:alert(1)">x</a></p>');
    assert.doesNotMatch(html, /javascript:/);
  });

  it("removes a figure whose media never resolved", () => {
    const { html, removed } = dropEmptyMediaFigures(
      '<figure><figcaption>ATTD media</figcaption></figure><figure><img src="/a.jpg" alt="a" /></figure>',
    );
    assert.equal(removed, 1);
    assert.doesNotMatch(html, /ATTD media/);
    assert.match(html, /\/a\.jpg/);
  });

  it("removes a duplicated title echo above the first section", () => {
    const source = "Hướng dẫn chọn áo polo\n<h2>Giới thiệu</h2>\n<p>Nội dung.</p>";
    const { html, removed } = dropLeadingTitleEcho(source, "Hướng dẫn chọn áo polo");

    assert.equal(removed, true);
    assert.match(html, /^<h2>Giới thiệu<\/h2>/);

    // A paragraph that merely starts the article is not an echo.
    const kept = dropLeadingTitleEcho("<p>Mở đầu bài viết.</p>", "Hướng dẫn chọn áo polo");
    assert.equal(kept.removed, false);
  });

  it("keeps conversion sections out of the table of contents", () => {
    assert.equal(isNonTocHeading("Câu hỏi thường gặp"), true);
    assert.equal(isNonTocHeading("Liên hệ / Đặt hàng"), true);
    assert.equal(isNonTocHeading("Yêu cầu tư vấn và báo giá"), true);
    assert.equal(isNonTocHeading("Chất liệu vải"), false);
  });

  it("does not mutate the stored body it was given", () => {
    const source = BROKEN_FRAGMENT;
    const before = String(source);
    prepareBlogArticleContent(source, { canonicalFaqQuestions: ["Nên in hay thêu logo?"] });
    assert.equal(source, before);
  });
});
