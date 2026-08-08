import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
import { getCollectionContent } from "@/lib/collectionContent";
import { getWholesaleContent } from "@/lib/wholesaleContent";

function assertNoUnsafeCommercialClaims(blob: string) {
  assert.doesNotMatch(blob, /chiết khấu\s*10-20%/i);
  assert.doesNotMatch(blob, /hơn\s*200\s*đối tác/i);
  assert.doesNotMatch(blob, /MOQ\s*(cho mỗi màu|tối thiểu)?\s*(là|=)?\s*\d+/i);
  assert.doesNotMatch(blob, /giao trong\s*\d+\s*-\s*\d+\s*ngày/i);
  assert.doesNotMatch(blob, /\bblank\b/i);
}

describe("Revenue Mode R1.1 content", () => {
  it("hardens t-shirt sourcing landings against fabricated claims", () => {
    for (const slug of ["ao-thun-tron-si", "kho-ao-thun-tron", "nguon-hang-ao-thun-tron"] as const) {
      const page = getWholesaleContent(slug);
      assert.ok(page, slug);
      const blob = [
        page.seoTitle,
        page.metaDescription,
        page.h1,
        page.heroIntro,
        page.intro,
        ...page.faq.map((f) => `${f.question} ${f.answer}`),
        ...page.whyAttd.map((w) => `${w.title} ${w.description}`),
      ].join("\n");
      assertNoUnsafeCommercialClaims(blob);
    }

    const category = getCollectionContent("ao-thun-tron");
    assert.ok(category);
    assertNoUnsafeCommercialClaims(
      [
        category.seoTitle,
        category.metaDescription,
        category.shortIntro,
        category.intro,
        ...category.faq.map((f) => `${f.question} ${f.answer}`),
        ...category.benefits.map((b) => `${b.title} ${b.description}`),
      ].join("\n")
    );
  });

  it("four R1 drafts share hub links and avoid blank terminology", () => {
    const pages = [
      { slug: R1_BLOG_XUONG_IN.slug, html: buildR1XuongInHtml() },
      { slug: R1_BLOG_FABRIC.slug, html: buildR1FabricHtml() },
      { slug: R1_BLOG_PRINT.slug, html: buildR1PrintHtml() },
      { slug: R1_BLOG_FORM.slug, html: buildR1FormHtml() },
    ];
    for (const page of pages) {
      assert.doesNotMatch(page.html, /\bblank\b/i);
      assert.match(page.html, /href="\/ao-thun-tron-si"/);
      assert.match(page.html, /href="\/lien-he"/);
      assert.match(page.html, /blog-cta-block/);
      assert.match(page.html, /<img\b/i);
    }
  });

  it("articles cross-link within the R1 educational cluster", () => {
    const a1 = buildR1XuongInHtml();
    const a2 = buildR1FabricHtml();
    const a3 = buildR1PrintHtml();
    const a4 = buildR1FormHtml();
    assert.match(a1, /ao-thun-cvc-tc-cotton-khac-nhau/);
    assert.match(a1, /chon-ao-tron-de-in-lua-dtf-va-theu/);
    assert.match(a1, /regular-hay-oversize-xuong-in-nen-nhap-form-nao/);
    assert.match(a2, /cach-chon-nguon-ao-thun-tron-cho-xuong-in/);
    assert.match(a3, /ao-thun-tron-si/);
    assert.match(a4, /ao-thun-regular/);
  });
});
