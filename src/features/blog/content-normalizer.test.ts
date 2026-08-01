import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  hasMarkdownLeak,
  normalizeBlogContent,
  normalizeMarkdownIslands,
} from "@/features/blog/content-normalizer";
import { contentToEditorMarkdown } from "@/features/blog/html-to-markdown";
import { prepareBlogArticleContent } from "@/features/blog/prepare-content";
import { renderBlogPreviewFromMarkdown } from "@/features/blog/preview-content";
import { sanitizeBlogHandoffHtml } from "@/features/content/content-review.types";
import { renderWritingDraftHtml } from "@/features/writing-engine/renderers/html-renderer";
import type { WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";

const HANDOFF_SOURCE = readFileSync(
  path.join(process.cwd(), "src/features/content/services/writing-blog-handoff.service.ts"),
  "utf8",
);

/** Any of these appearing in stored or rendered content is the bug this suite guards. */
const MARKDOWN_LEAK = /(^\s{0,3}#{1,6}\s+\S)|(^\s{0,3}[-*+]\s+\S)|(\*\*[^*\n]+\*\*)|(:::(cta|faq))/m;

function draftFixture(overrides: Partial<WritingStructuredDraft> = {}): WritingStructuredDraft {
  return {
    title: "Hướng dẫn chọn áo polo đồng phục công ty",
    sections: [],
    faq: [],
    cta: { primary: { text: "", destination: null } },
    media: [],
    ...overrides,
  } as unknown as WritingStructuredDraft;
}

describe("Sprint 13.6 — markdown never leaks into Blog HTML", () => {
  it("1. converts a pure markdown document to HTML", () => {
    const html = normalizeBlogContent("## Giới thiệu\n\nĐoạn mở đầu.\n\n- Ý một\n- Ý hai");
    assert.match(html, /<h2>Giới thiệu<\/h2>/);
    assert.match(html, /<li>Ý một<\/li>/);
    assert.doesNotMatch(html, MARKDOWN_LEAK);
  });

  it("2. converts a markdown island inside an otherwise-HTML document", () => {
    const mixed = '<p>Đoạn HTML sẵn có.</p>\n\n## Tiêu đề markdown\n\nĐoạn markdown.\n\n<p>Đoạn cuối.</p>';
    const html = normalizeBlogContent(mixed);
    assert.match(html, /<h2>Tiêu đề markdown<\/h2>/);
    assert.match(html, /<p>Đoạn markdown\.<\/p>/);
    assert.doesNotMatch(html, MARKDOWN_LEAK);
  });

  it("3. leaves existing HTML untouched", () => {
    const source = '<p>Đoạn <strong>in đậm</strong> giữ nguyên.</p>\n<h2>Tiêu đề</h2>';
    assert.equal(normalizeMarkdownIslands(source), source);
  });

  it("4. is idempotent on already clean HTML", () => {
    const source = "<h2>Một</h2>\n<p>Hai</p>\n<ul>\n<li>Ba</li>\n</ul>";
    const once = normalizeBlogContent(source);
    assert.equal(normalizeBlogContent(once), once);
  });

  it("5. preserves anchor ids used by the table of contents", () => {
    const source = '<h2 id="tieu-chi-chon-vai">Tiêu chí chọn vải</h2>\n\n## Thêm bằng markdown';
    const html = normalizeBlogContent(source);
    assert.match(html, /<h2 id="tieu-chi-chon-vai">Tiêu chí chọn vải<\/h2>/);
    assert.match(html, /<h2>Thêm bằng markdown<\/h2>/);
  });

  it("6. preserves internal links", () => {
    const source = '<p>Xem <a href="/blog/cach-chon-ao-polo-tron-dong-phuc">hướng dẫn</a>.</p>\n\n## Mới';
    const html = normalizeBlogContent(source);
    assert.match(html, /<a href="\/blog\/cach-chon-ao-polo-tron-dong-phuc">hướng dẫn<\/a>/);
  });

  it("7. preserves media references", () => {
    const source =
      '<figure data-media-id="media_123"><img src="/uploads/polo.jpg" alt="Áo polo" /><figcaption>Áo polo</figcaption></figure>\n\n## Sau ảnh';
    const html = normalizeBlogContent(source);
    assert.match(html, /data-media-id="media_123"/);
    assert.match(html, /src="\/uploads\/polo\.jpg"/);
    assert.match(html, /<h2>Sau ảnh<\/h2>/);
  });

  it("8. preserves inline FAQ markup", () => {
    const source =
      '<section class="blog-inline-faq"><details class="blog-inline-faq__item" open><summary>Hỏi?</summary><p>Đáp.</p></details></section>\n\n## Sau FAQ';
    const html = normalizeBlogContent(source);
    assert.match(html, /class="blog-inline-faq"/);
    assert.match(html, /<summary>Hỏi\?<\/summary>/);
  });

  it("9. expands :::cta and :::faq fences instead of printing them", () => {
    const html = normalizeBlogContent(
      ":::cta\ntitle: Nhận báo giá\nbutton: Liên hệ\nurl: /lien-he\n:::\n\n:::faq\nQ: Hỏi?\nA: Đáp.\n:::",
    );
    assert.match(html, /class="blog-cta-block"/);
    assert.match(html, /class="blog-inline-faq"/);
    assert.doesNotMatch(html, /:::/);
  });

  it("10. converts markdown tables", () => {
    const html = normalizeBlogContent("| Chất liệu | Định lượng |\n| --- | --- |\n| CVC | 220gsm |");
    assert.match(html, /<table>/);
    assert.match(html, /<td>CVC<\/td>/);
  });

  it("11. detects a markdown leak and clears clean HTML", () => {
    assert.equal(hasMarkdownLeak("<p>Sạch</p>\n<h2>Ổn</h2>"), false);
    assert.equal(hasMarkdownLeak("<p>Sạch</p>\n\n## Rò rỉ"), true);
    assert.equal(hasMarkdownLeak(""), false);
  });

  it("12. handles nested blocks of the same tag without swallowing siblings", () => {
    const source = "<div><div><p>Trong</p></div></div>\n\n## Ngoài";
    const html = normalizeBlogContent(source);
    assert.match(html, /<div><div><p>Trong<\/p><\/div><\/div>/);
    assert.match(html, /<h2>Ngoài<\/h2>/);
  });

  it("13. drops the draft H1 whole so no orphan title line remains", () => {
    const out = sanitizeBlogHandoffHtml("<h1>Tiêu đề bài viết</h1>\n<h2>Giới thiệu</h2>\n<p>Nội dung.</p>");
    assert.doesNotMatch(out, /Tiêu đề bài viết/);
    assert.match(out, /^<h2>Giới thiệu<\/h2>/);
  });

  it("14. keeps media and link attributes through handoff sanitization", () => {
    const out = sanitizeBlogHandoffHtml(
      '<h2 id="vai">Vải</h2><figure data-media-id="m1"><img src="/uploads/a.jpg" alt="A" /></figure><p><a href="/lien-he">Liên hệ</a></p>',
    );
    assert.match(out, /id="vai"/);
    assert.match(out, /data-media-id="m1"/);
    assert.match(out, /src="\/uploads\/a\.jpg"/);
    assert.match(out, /href="\/lien-he"/);
  });

  it("15. strips unsafe markup during handoff sanitization", () => {
    const out = sanitizeBlogHandoffHtml(
      '<p onclick="steal()">Ok</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
    );
    assert.doesNotMatch(out, /onclick/);
    assert.doesNotMatch(out, /script/i);
    assert.doesNotMatch(out, /javascript:/);
  });

  it("16. renders a draft whose model returned markdown as clean HTML", () => {
    const html = renderWritingDraftHtml(
      draftFixture({
        sections: [
          {
            heading: "Chọn chất liệu",
            html: "### Vải CVC\n\nCVC bền màu.\n\n- Thoáng mát\n- Ít nhăn",
          },
        ],
      } as Partial<WritingStructuredDraft>),
    );
    assert.match(html, /<h3>Vải CVC<\/h3>/);
    assert.match(html, /<li>Thoáng mát<\/li>/);
    assert.doesNotMatch(html.replace(/<h1>[\s\S]*?<\/h1>/, ""), MARKDOWN_LEAK);
  });

  it("17. renders draft sections that are already HTML unchanged", () => {
    const html = renderWritingDraftHtml(
      draftFixture({
        sections: [{ heading: "Giới thiệu", html: "<p>Đoạn <strong>HTML</strong>.</p>" }],
      } as Partial<WritingStructuredDraft>),
    );
    assert.match(html, /<p>Đoạn <strong>HTML<\/strong>\.<\/p>/);
  });

  it("18. routes governed handoff content through the canonical normalizer", () => {
    assert.match(HANDOFF_SOURCE, /normalizeBlogContent\(sanitizeBlogHandoffHtml\(html\)\)/);
    assert.match(HANDOFF_SOURCE, /from "@\/features\/blog\/content-normalizer"/);
  });

  it("19. never renders literal markdown on the public page", () => {
    const processed = prepareBlogArticleContent("## Giới thiệu\n\nĐoạn văn.\n\n## Kết luận\n\nHết.");
    assert.doesNotMatch(processed.html, MARKDOWN_LEAK);
    assert.equal(processed.headings.length, 2);
    assert.equal(processed.headings[0].id, "gioi-thieu");
  });

  it("20. keeps the admin preview identical to the public render", () => {
    const source = "<p>Đoạn.</p>\n\n## Tiêu đề\n\nNội dung.";
    const preview = renderBlogPreviewFromMarkdown(source);
    const publicHtml = prepareBlogArticleContent(normalizeBlogContent(source)).html;
    assert.equal(preview, publicHtml);
    assert.doesNotMatch(preview, MARKDOWN_LEAK);
  });

  it("21. survives the editor round-trip without losing links or media", () => {
    const stored =
      '<h2>Giới thiệu</h2>\n<p>Xem <a href="/blog/ao-polo">bài viết</a>.</p>\n<figure data-media-id="m9"><img src="/uploads/b.jpg" alt="B" /></figure>';
    const inEditor = contentToEditorMarkdown(stored);
    const resaved = normalizeBlogContent(inEditor);
    assert.match(resaved, /href="\/blog\/ao-polo"/);
    assert.match(resaved, /data-media-id="m9"/);
    assert.match(resaved, /<h2>Giới thiệu<\/h2>/);
    assert.doesNotMatch(resaved, MARKDOWN_LEAK);
  });

  it("22. re-saving governed content keeps it markdown-free", () => {
    const stored = normalizeBlogContent("## Một\n\nĐoạn.\n\n## Hai\n\nĐoạn.");
    const resaved = normalizeBlogContent(contentToEditorMarkdown(stored));
    assert.doesNotMatch(resaved, MARKDOWN_LEAK);
    assert.equal((resaved.match(/<h2/g) ?? []).length, 2);
  });

  it("23. treats an empty document as empty", () => {
    assert.equal(normalizeBlogContent("   "), "");
    assert.equal(normalizeMarkdownIslands(""), "");
    assert.equal(prepareBlogArticleContent(null).html, "");
  });
});
