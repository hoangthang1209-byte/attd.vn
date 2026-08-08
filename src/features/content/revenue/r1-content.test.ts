import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  R1_BLOG_FABRIC,
  buildR1FabricHtml,
} from "@/features/content/revenue/r1-blog-fabric.content";
import {
  R1_BLOG_XUONG_IN,
  buildR1XuongInHtml,
} from "@/features/content/revenue/r1-blog-xuong-in.content";
import { getWholesaleContent } from "@/lib/wholesaleContent";

describe("Revenue Mode R1 content", () => {
  it("commercial hub avoids fabricated MOQ/price/discount claims", () => {
    const page = getWholesaleContent("ao-thun-tron-si");
    assert.ok(page);
    const blob = [
      page.seoTitle,
      page.metaDescription,
      page.h1,
      page.heroIntro,
      page.intro,
      ...page.faq.map((f) => `${f.question} ${f.answer}`),
      ...page.whyAttd.map((w) => `${w.title} ${w.description}`),
    ].join("\n");

    assert.doesNotMatch(blob, /chiết khấu\s*10-20%/i);
    assert.doesNotMatch(blob, /hơn\s*200\s*đối tác/i);
    assert.doesNotMatch(blob, /MOQ\s*(cho mỗi màu|tối thiểu)?\s*là\s*\d+/i);
    assert.doesNotMatch(blob, /\bblank\b/i);
    assert.match(page.primaryCta?.href ?? "", /\/lien-he/);
    assert.match(page.secondaryCta?.href ?? "", /\/ao-thun-tron/);
  });

  it("xuong-in draft uses Vietnamese trơn vocabulary and hub links", () => {
    const html = buildR1XuongInHtml();
    assert.equal(R1_BLOG_XUONG_IN.slug, "cach-chon-nguon-ao-thun-tron-cho-xuong-in");
    assert.doesNotMatch(html, /\bblank\b/i);
    assert.doesNotMatch(html, /MOQ\s*=?\s*\d+/i);
    assert.match(html, /áo thun trơn/);
    assert.match(html, /href="\/ao-thun-tron-si"/);
    assert.match(html, /href="\/lien-he"/);
    assert.match(html, /blog-cta-block/);
  });

  it("fabric draft compares cotton/CVC/polyester without inventing commercial numbers", () => {
    const html = buildR1FabricHtml();
    assert.equal(R1_BLOG_FABRIC.slug, "ao-thun-cvc-tc-cotton-khac-nhau");
    assert.doesNotMatch(html, /\bblank\b/i);
    assert.doesNotMatch(html, /giá\s*\d[\d.,]*\s*(đ|vnd)/i);
    assert.match(html, /Cotton/);
    assert.match(html, /CVC/);
    assert.match(html, /Polyester/);
    assert.match(html, /href="\/san-pham\/ao-thun-cvc-65-35"/);
    assert.match(html, /blog-cta-block/);
  });
});
