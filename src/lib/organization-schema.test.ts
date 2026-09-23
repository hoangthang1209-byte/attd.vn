import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildArticleJsonLd } from "@/components/seo/ArticleSchema";
import { buildCollectionPageJsonLd } from "@/components/seo/CollectionSchema";
import { companyInfo } from "@/lib/companyInfo";
import {
  buildOrganizationJsonLd,
  organizationEntityFromJsonLd,
} from "@/lib/organization-schema";

describe("organization structured data", () => {
  it("buildOrganizationJsonLd includes dynamic company contact fields", () => {
    const jsonLd = buildOrganizationJsonLd(companyInfo, {
      facebookUrl: "https://facebook.com/attd",
      linkedinUrl: null,
      zaloUrl: companyInfo.zalo.url,
    });

    assert.equal(jsonLd["@type"], "Organization");
    assert.equal(jsonLd.name, companyInfo.name);
    assert.equal(jsonLd.telephone, companyInfo.hotline.international);
    assert.equal(jsonLd.url, "https://www.attd.vn");
    assert.ok(Array.isArray(jsonLd.sameAs));
    assert.ok((jsonLd.sameAs as string[]).includes(companyInfo.zalo.url));
  });

  it("organizationEntityFromJsonLd strips @context for nested use", () => {
    const jsonLd = buildOrganizationJsonLd(companyInfo);
    const entity = organizationEntityFromJsonLd(jsonLd);

    assert.equal(entity["@context"], undefined);
    assert.equal(entity["@type"], "Organization");
    assert.equal(entity.name, companyInfo.name);
  });

  it("buildArticleJsonLd uses the canonical organization entity for publisher", () => {
    const organization = organizationEntityFromJsonLd(buildOrganizationJsonLd(companyInfo));
    const jsonLd = buildArticleJsonLd(
      {
        headline: "Hướng dẫn chọn áo polo",
        description: "Kiến thức B2B từ ATTD.",
        slug: "huong-dan-chon-ao-polo",
        datePublished: "2026-01-01T00:00:00.000Z",
        dateModified: "2026-01-02T00:00:00.000Z",
      },
      organization,
    );

    assert.equal(jsonLd["@type"], "Article");
    assert.deepEqual(jsonLd.publisher, organization);
    assert.deepEqual(jsonLd.author, organization);
    assert.equal(jsonLd.url, "https://www.attd.vn/blog/huong-dan-chon-ao-polo");
  });

  it("buildCollectionPageJsonLd emits CollectionPage for blog category archives", () => {
    const jsonLd = buildCollectionPageJsonLd({
      title: "Hướng dẫn",
      description: "Bài viết về Hướng dẫn — kiến thức B2B từ ATTD.",
      url: "https://www.attd.vn/blog/danh-muc/huong-dan",
    });

    assert.equal(jsonLd["@type"], "CollectionPage");
    assert.equal(jsonLd.name, "Hướng dẫn");
    assert.equal(jsonLd.url, "https://www.attd.vn/blog/danh-muc/huong-dan");
    assert.equal((jsonLd.publisher as { name?: string }).name, "ATTD");
  });
});
