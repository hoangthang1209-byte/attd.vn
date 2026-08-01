import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  READINESS_THRESHOLDS,
  buildContentQualityWarnings,
  evaluateBlogReadiness,
  formatThreshold,
  type BlogReadinessInput,
} from "@/features/blog/blog-readiness";
import { analyzeBlogContent } from "@/features/blog/content-metrics";
import { calculateContentHealth } from "@/features/blog/content-health";
import { calculateSeoScore } from "@/features/blog/seo-score";
import { calculateAiContentReadiness } from "@/features/blog/ai-content-readiness";
import { internalLinkCount } from "@/features/blog/seo-score-utils";

const PUBLISH_READINESS_SOURCE = readFileSync(
  path.join(process.cwd(), "src/features/content/services/content-publish-readiness.service.ts"),
  "utf8",
);

const ARTICLE = [
  "<h2>Giới thiệu</h2>",
  "<p>Bài viết hướng dẫn chọn áo polo đồng phục công ty cho doanh nghiệp.</p>",
  '<p>Xem thêm <a href="/blog/cach-chon-ao-polo-tron-dong-phuc">hướng dẫn chọn phôi</a>.</p>',
  "<h2>Chất liệu</h2>",
  '<p>Tham khảo <a href="/nguon-hang-ao-thun-tron">nguồn hàng</a> và <a href="/oem">dịch vụ OEM</a>.</p>',
  "<h2>Kết luận</h2>",
  '<p><a href="/lien-he">Liên hệ nhận báo giá</a></p>',
  '<figure data-media-id="m1"><img src="/uploads/polo.jpg" alt="Áo polo" /></figure>',
].join("\n");

function baseInput(overrides: Partial<BlogReadinessInput> = {}): BlogReadinessInput {
  return {
    title: "Hướng dẫn chọn áo polo đồng phục công ty",
    slug: "huong-dan-chon-ao-polo-dong-phuc-cong-ty",
    metaTitle: "Hướng dẫn chọn áo polo đồng phục công ty | ATTD",
    metaDescription:
      "Checklist chọn áo polo đồng phục công ty: chất liệu, định lượng, form dáng và ngân sách.",
    excerpt: "Checklist chọn áo polo đồng phục.",
    featuredImageUrl: "/uploads/featured.jpg",
    ogImageUrl: null,
    content: ARTICLE,
    faqJson: [{ question: "Đặt tối thiểu bao nhiêu?", answer: "Tùy chất liệu." }],
    tags: ["ao-polo", "dong-phuc", "b2b"],
    server: null,
    ...overrides,
  };
}

describe("Sprint 13.6 — one canonical readiness evaluator", () => {
  it("1. counts internal links that the reader will actually see", () => {
    const metrics = analyzeBlogContent({ content: ARTICLE });
    assert.equal(metrics.internalLinks.authored, 4);
    assert.ok(metrics.internalLinks.total >= 4);
  });

  it("2. exposes the same internal-link number to every legacy helper", () => {
    const canonical = analyzeBlogContent({ content: ARTICLE }).internalLinks.total;
    assert.equal(internalLinkCount(ARTICLE), canonical);

    const health = calculateContentHealth(ARTICLE, [], []);
    const healthLinks = health.metrics.find((item) => item.label === "Internal Links");
    assert.equal(healthLinks?.value, canonical);

    const ai = calculateAiContentReadiness({
      content: ARTICLE,
      faqJson: [],
      tags: [],
      metaTitle: "",
      metaDescription: "",
    });
    const aiLinks = ai.checks.find((item) => item.label === "Internal links");
    assert.equal(aiLinks?.value, formatThreshold(canonical, READINESS_THRESHOLDS.internalLinks));
  });

  it("3. formats warnings as Recommended and blockers as Required", () => {
    assert.equal(formatThreshold(0, READINESS_THRESHOLDS.internalLinks), "0 / Recommended 3");
    assert.equal(formatThreshold(4, READINESS_THRESHOLDS.internalLinks), "4 / Recommended 3");
    assert.equal(formatThreshold(0, { required: 3, recommended: 5 }), "0 / Required 3");
  });

  it("4. says CTA Missing instead of CTA = No", () => {
    const withoutCta = evaluateBlogReadiness(baseInput({ content: "<h2>A</h2><p>Không có CTA.</p>" }));
    const signal = withoutCta.signals.find((item) => item.code === "CTA");
    assert.equal(signal?.display, "CTA Missing");
    assert.equal(signal?.severity, "WARNING");

    const withCta = evaluateBlogReadiness(baseInput());
    assert.equal(withCta.signals.find((item) => item.code === "CTA")?.display, "CTA Ready");
  });

  it("5. detects a CTA block as well as a CTA link", () => {
    const block = analyzeBlogContent({
      content: ':::cta\ntitle: Nhận báo giá\nbutton: Liên hệ\nurl: /lien-he\n:::',
    });
    assert.equal(block.cta.present, true);
    assert.equal(block.cta.source, "block");
  });

  it("6. stays READY when the server says ready even with open warnings", () => {
    const result = evaluateBlogReadiness(
      baseInput({
        content: "<h2>Ngắn</h2><p>Bài viết ngắn.</p>",
        server: { ready: true, errors: [], warnings: [] },
      }),
    );
    assert.equal(result.status, "READY");
    assert.equal(result.blockers.length, 0);
    assert.ok(result.warnings.length > 0);
    assert.ok(result.warnings.every((item) => item.severity === "WARNING"));
  });

  it("7. is BLOCKED whenever the server reports an error", () => {
    const result = evaluateBlogReadiness(
      baseInput({ server: { ready: false, errors: ["Thiếu canonical"], warnings: [] } }),
    );
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.blockers.length, 1);
    assert.equal(result.blockers[0].label, "Thiếu canonical");
  });

  it("8. warns about unsaved edits instead of contradicting the server", () => {
    const result = evaluateBlogReadiness(
      baseInput({ server: { ready: true, errors: [], warnings: [] }, dirty: true }),
    );
    assert.equal(result.status, "READY");
    assert.equal(result.warnings[0].code, "UNSAVED_CHANGES");
  });

  it("9. reports UNKNOWN before the server has been consulted", () => {
    const result = evaluateBlogReadiness(baseInput());
    assert.equal(result.serverChecked, false);
    assert.equal(result.status, "UNKNOWN");
  });

  it("10. treats missing hard fields as blockers before the first save", () => {
    const result = evaluateBlogReadiness(baseInput({ metaTitle: "", featuredImageUrl: null }));
    const codes = result.blockers.map((item) => item.code);
    assert.ok(codes.includes("META_TITLE"));
    assert.ok(codes.includes("FEATURED_IMAGE"));
    assert.equal(result.status, "BLOCKED");
  });

  it("11. separates Featured Image, Body Images and Media References", () => {
    const result = evaluateBlogReadiness(baseInput());
    assert.equal(result.metrics.bodyImages, 1);
    assert.equal(result.metrics.mediaReferences, 1);
    const featured = result.signals.find((item) => item.code === "FEATURED_IMAGE");
    const body = result.signals.find((item) => item.code === "BODY_IMAGES");
    assert.equal(featured?.severity, "BLOCKER");
    assert.equal(body?.severity, "WARNING");
    assert.match(body?.hint ?? "", /không tính Featured Image/i);
  });

  it("12. keeps the SEO score and the readiness signals in agreement", () => {
    const input = baseInput();
    const readiness = evaluateBlogReadiness(input);
    const seo = calculateSeoScore({
      title: input.title,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      featuredImageUrl: input.featuredImageUrl,
      content: input.content,
      faqJson: input.faqJson,
      tags: input.tags,
    });
    assert.equal(seo.score, readiness.quality.score);
    assert.equal(seo.level, readiness.quality.level);
    const linkItem = seo.checklist.find((item) => item.label === "Internal links >= 3");
    assert.equal(
      linkItem?.ok,
      readiness.signals.find((item) => item.code === "INTERNAL_LINKS")?.ok,
    );
  });

  it("13. builds server warnings from the same thresholds", () => {
    const warnings = buildContentQualityWarnings({
      content: "<h2>Một</h2><p>Ngắn.</p>",
      faqJson: [],
      tags: [],
    });
    assert.ok(warnings.some((item) => item.startsWith("Internal links 0 / Recommended 3")));
    assert.ok(warnings.some((item) => item.startsWith("CTA Missing")));
    assert.ok(warnings.every((item) => item.includes("cảnh báo")));
  });

  it("14. emits no content-quality warning for a complete article", () => {
    const warnings = buildContentQualityWarnings({
      content: `${ARTICLE}<p>${"từ ".repeat(1300)}</p>`,
      faqJson: [],
      tags: [],
    });
    assert.deepEqual(warnings, []);
  });

  it("15. wires the publish-readiness service to the canonical warnings", () => {
    assert.match(PUBLISH_READINESS_SOURCE, /buildContentQualityWarnings/);
    assert.match(PUBLISH_READINESS_SOURCE, /from "@\/features\/blog\/blog-readiness"/);
  });

  it("16. counts markdown content the same way as HTML content", () => {
    const markdown = "## Giới thiệu\n\nĐoạn văn.\n\n[Liên hệ](/lien-he)";
    const html = "<h2>Giới thiệu</h2>\n<p>Đoạn văn.</p>\n<p><a href=\"/lien-he\">Liên hệ</a></p>";
    const fromMarkdown = analyzeBlogContent({ content: markdown });
    const fromHtml = analyzeBlogContent({ content: html });
    assert.equal(fromMarkdown.h2Count, fromHtml.h2Count);
    assert.equal(fromMarkdown.internalLinks.authored, fromHtml.internalLinks.authored);
    assert.equal(fromMarkdown.cta.present, fromHtml.cta.present);
  });

  it("17. ignores admin links when counting internal links", () => {
    const metrics = analyzeBlogContent({
      content: '<p><a href="/admin/blog">Quản trị</a> và <a href="https://google.com">Google</a></p>',
    });
    assert.equal(metrics.internalLinks.authored, 0);
    assert.equal(metrics.externalLinks, 1);
  });

  it("18. counts FAQ from both inline blocks and the FAQ builder", () => {
    const metrics = analyzeBlogContent({
      content: ":::faq\nQ: Hỏi?\nA: Đáp.\n:::",
      faqJson: [{ question: "Q2", answer: "A2" }],
    });
    assert.equal(metrics.faq.inline, 1);
    assert.equal(metrics.faq.structured, 1);
    assert.equal(metrics.faq.total, 2);
  });

  it("19. handles empty content without throwing", () => {
    const result = evaluateBlogReadiness(baseInput({ content: "" }));
    assert.equal(result.metrics.wordCount, 0);
    assert.ok(result.blockers.some((item) => item.code === "CONTENT"));
  });
});
