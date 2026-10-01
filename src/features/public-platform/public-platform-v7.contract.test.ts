import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Public Platform V7 contracts", () => {
  it("preserves structured dealer and landing lead attribution", () => {
    const dealer = read("src/app/(public)/dai-ly/page.tsx");
    const sourcing = read("src/app/(public)/nguon-hang/page.tsx");
    const oem = read("src/app/(public)/oem/page.tsx");
    const gifts = read("src/app/(public)/qua-tang-doanh-nghiep/page.tsx");

    assert.match(dealer, /source="DEALER_FORM"/);
    assert.match(sourcing, /source="WHOLESALE_PAGE"/);
    assert.match(oem, /source="OEM_PAGE"/);
    assert.match(gifts, /source="CORPORATE_GIFTS_PAGE"/);

    for (const source of [dealer, sourcing, oem, gifts]) {
      assert.match(source, /resolveBespokeLanding/);
      assert.match(source, /FaqSchema/);
      assert.match(source, /canonicalUrl/);
      assert.match(source, /buildOgImages/);
    }
  });

  it("keeps business context as structured CRM source detail", () => {
    const form = read("src/components/public/ContactForm.tsx");
    const route = read("src/app/api/leads/route.ts");

    assert.match(form, /searchParams\.get\("service"\)/);
    assert.match(form, /sourceDetail/);
    assert.match(form, /JSON\.stringify\(\{ name, phone, email, company, message, sourceDetail \}\)/);

    assert.match(route, /sourceDetailInput/);
    assert.match(route, /sourceDetail: inquiry\?\.productUrl\?\.trim\(\) \|\| sourceDetailInput/);
  });

  it("keeps category discovery and CMS navigation in the V7 shell", () => {
    const layout = read("src/app/(public)/layout.tsx");
    const header = read("src/components/public/v7/PublicHeaderV7.tsx");
    const footer = read("src/components/public/v7/PublicFooterV7.tsx");

    assert.match(layout, /getMarketplaceCategoryTree/);
    assert.match(layout, /categoryTree=\{categoryTree\}/);
    assert.match(layout, /siteNavigation=\{siteNavigation\}/);

    assert.match(header, /MarketplaceCategoryTreeNode/);
    assert.match(header, /\/danh-muc-san-pham/);
    assert.match(header, /\/merchandise/);
    assert.match(header, /\/dong-phuc-doanh-nghiep/);

    assert.match(footer, /PublicSiteNavigation/);
    assert.match(footer, /siteNavigation\.footerGroups/);
    assert.match(footer, /siteNavigation\.socialLinks/);
    assert.match(footer, /siteNavigation\.ctas\.FOOTER/);
  });

  it("defines dedicated real-media surfaces for uniform and merchandise", () => {
    const media = read("src/features/media/public-surface-media.ts");

    assert.match(media, /\| "uniform"/);
    assert.match(media, /\| "merchandise"/);
    assert.match(media, /libraryCode: "UNIFORM"/);
    assert.match(media, /libraryCode: "MERCHANDISE"/);
    assert.match(media, /visibility: "PUBLIC"/);
    assert.match(media, /cache\(/);
  });

  it("keeps the five business engines first-class in the public IA", () => {
    const home = read("src/app/(public)/page.tsx");
    const header = read("src/components/public/v7/PublicHeaderV7.tsx");

    for (const href of [
      "/dong-phuc-doanh-nghiep",
      "/nguon-hang",
      "/oem",
      "/qua-tang-doanh-nghiep",
      "/merchandise",
    ]) {
      assert.ok(home.includes(href), `homepage should link to ${href}`);
      assert.ok(header.includes(href), `header should link to ${href}`);
    }
  });
  it("keeps V7 commerce surfaces wired across catalog, categories and PDP", () => {
    const catalog = read("src/app/(public)/san-pham/page.tsx");
    const categoryHub = read("src/app/(public)/danh-muc-san-pham/page.tsx");
    const collection = read("src/app/(public)/[category]/page.tsx");
    const pdp = read("src/app/(public)/san-pham/[slug]/page.tsx");

    assert.match(catalog, /className="v7-catalog"/);
    assert.match(catalog, /v7-catalog-intents/);
    assert.match(categoryHub, /className="v7-category-hub"/);
    assert.match(categoryHub, /publicCategoryHref\(section\.slug\)/);
    assert.match(collection, /className="v7-category-page"/);
    assert.match(collection, /v7-collection-gallery/);
    assert.match(pdp, /v7-pdp/);
    assert.match(pdp, /v7-pdp-context/);
  });

});
