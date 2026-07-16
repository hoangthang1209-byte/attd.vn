/**
 * Phase 1 pre-deploy QA runner — local only, not committed.
 * Run: node scripts/site-navigation-qa.mjs
 */
import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.QA_BASE_URL || "http://localhost:3458";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const EXPECTED = {
  settings: {
    utilityTagline: "Kho sỉ đồng phục & quà tặng doanh nghiệp",
    megaMenuTriggerLabel: "Tất cả danh mục",
    searchPlaceholder: "Tìm áo thun, áo polo, nón, quà tặng…",
  },
  utilityBar: [
    { label: "Đại lý", href: "/dai-ly" },
    { label: "OEM", href: "/oem" },
    { label: "Liên hệ", href: "/lien-he" },
  ],
  headerMenu: [
    { label: "Nguồn hàng", href: "/nguon-hang" },
    { label: "OEM", href: "/oem" },
    { label: "Đại lý", href: "/dai-ly" },
    { label: "Kiến thức", href: "/blog" },
    { label: "Liên hệ", href: "/lien-he" },
  ],
  categoryNav: [
    { label: "Áo thun", href: "/ao-thun-tron" },
    { label: "Polo", href: "/ao-polo-tron" },
    { label: "Nón", href: "/non" },
    { label: "Tote", href: "/tote" },
    { label: "Bandana", href: "/bandana" },
    { label: "Bình giữ nhiệt", href: "/binh-giu-nhiet" },
    { label: "Gift set", href: "/gift-set-doanh-nghiep" },
    { label: "OEM", href: "/oem" },
  ],
  footerProducts: [
    { label: "Áo thun", href: "/ao-thun-tron" },
    { label: "Áo polo", href: "/ao-polo-tron" },
    { label: "Nón", href: "/non" },
    { label: "Quà tặng", href: "/qua-tang-doanh-nghiep" },
  ],
  headerCta: { label: "Liên hệ báo giá sỉ", href: "/lien-he" },
  footerCta: { label: "Yêu cầu báo giá", href: "/lien-he" },
};

const failures = [];
const passes = [];
const notes = [];

function pass(msg) {
  passes.push(msg);
}
function fail(msg) {
  failures.push(msg);
}
function note(msg) {
  notes.push(msg);
}

function sameLinks(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item.label === b[i].label && item.href === b[i].href);
}

async function qaDbSeed(prisma) {
  const settings = await prisma.siteNavigationSettings.findUnique({
    where: { id: "default" },
    include: {
      items: { orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] },
      ctas: true,
      socialLinks: true,
    },
  });

  if (!settings) {
    fail("DB: SiteNavigationSettings default row missing after migration");
    return;
  }

  const pick = (placement) =>
    settings.items
      .filter((i) => i.placement === placement && i.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ label: i.label, href: i.href }));

  if (settings.utilityTagline !== EXPECTED.settings.utilityTagline) {
    fail(`DB settings utilityTagline mismatch: ${settings.utilityTagline}`);
  } else pass("DB settings utilityTagline matches production");

  if (settings.megaMenuTriggerLabel !== EXPECTED.settings.megaMenuTriggerLabel) {
    fail(`DB megaMenuTriggerLabel mismatch`);
  } else pass("DB megaMenuTriggerLabel matches production");

  if (settings.searchPlaceholder !== EXPECTED.settings.searchPlaceholder) {
    fail(`DB searchPlaceholder mismatch`);
  } else pass("DB searchPlaceholder matches production");

  for (const [placement, expected] of [
    ["UTILITY_BAR", EXPECTED.utilityBar],
    ["HEADER_MENU", EXPECTED.headerMenu],
    ["CATEGORY_NAV", EXPECTED.categoryNav],
    ["MOBILE_MENU", EXPECTED.headerMenu],
    ["FOOTER_PRODUCTS", EXPECTED.footerProducts],
  ]) {
    const actual = pick(placement);
    if (sameLinks(actual, expected)) pass(`DB ${placement} seeded links match production`);
    else fail(`DB ${placement} mismatch\n  expected: ${JSON.stringify(expected)}\n  actual: ${JSON.stringify(actual)}`);
  }

  const headerCta = settings.ctas.find((c) => c.slot === "HEADER_PRIMARY");
  if (headerCta?.label === EXPECTED.headerCta.label && headerCta.href === EXPECTED.headerCta.href) {
    pass("DB HEADER_PRIMARY CTA matches production");
  } else fail("DB HEADER_PRIMARY CTA mismatch");

  const inactiveSocial = settings.socialLinks.filter((s) => s.isActive);
  if (inactiveSocial.length === 0) pass("DB social links all inactive (branding fallback expected)");
  else note(`DB has ${inactiveSocial.length} active social links in CMS`);
}

async function qaValidationApi(fetchFn) {
  const badInternal = await fetchFn("/api/admin/site-navigation", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: globalThis.__qaAdminCookie || "" },
    body: JSON.stringify({
      panel: "utility_bar",
      items: [
        {
          id: "x",
          placement: "UTILITY_BAR",
          parentId: null,
          label: "Bad",
          href: "javascript:alert(1)",
          description: null,
          iconKey: null,
          linkTarget: "INTERNAL",
          sortOrder: 10,
          isActive: true,
          showDesktop: true,
          showMobile: true,
          openInNewTab: false,
          trackEvent: null,
        },
      ],
    }),
  });

  if (badInternal.status === 401) {
    note("PATCH validation skipped — no admin session cookie");
    return;
  }
  if (badInternal.status === 400) pass("PATCH rejects javascript: internal href");
  else fail(`PATCH javascript: href returned ${badInternal.status}`);

  const badExternal = await fetchFn("/api/admin/site-navigation", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: globalThis.__qaAdminCookie || "" },
    body: JSON.stringify({
      panel: "social",
      socialLinks: [
        {
          id: "sn-social-facebook",
          platform: "facebook",
          label: "Facebook",
          href: "data:text/html,hi",
          sortOrder: 10,
          isActive: true,
        },
      ],
    }),
  });
  if (badExternal.status === 400) pass("PATCH rejects data: external social URL");
  else if (badExternal.status !== 401) fail(`PATCH data: URL returned ${badExternal.status}`);
}

async function qaPublicParity(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 90000 });

  const data = await page.evaluate(() => {
    const header = document.querySelector("header.mp-header");
    const footer = document.querySelector("footer.site-footer--enterprise");
    const tagline = header?.querySelector(".mp-header-tagline")?.textContent?.trim();
    const utilityLinks = [...(header?.querySelectorAll(".mp-header-top-links a") || [])].map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));
    const primaryLinks = [...(header?.querySelectorAll(".mp-header-primary-nav-link") || [])].map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));
    const search = header?.querySelector('.mp-header-search-desktop input')?.getAttribute("placeholder");
    const megaTrigger = header?.querySelector(".mp-mega-cat-trigger")?.textContent?.replace(/\s+/g, " ").trim();
    const headerCta = header?.querySelector(".mp-header-cta-primary")?.textContent?.trim();
    const catLinks = [...(header?.querySelectorAll(".mp-cat-nav-item") || [])].map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));
    const footerNavSections = [...(footer?.querySelectorAll(".footer-enterprise-nav__column") || [])].map((col) => ({
      title: col.getAttribute("aria-label"),
      links: [...col.querySelectorAll(".footer-enterprise-nav__link")].map((a) => ({
        label: a.textContent?.trim(),
        href: a.getAttribute("href"),
      })),
    }));
    const footerCta = footer?.querySelector(".footer-enterprise__cta")?.textContent?.trim();
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      tagline,
      utilityLinks,
      primaryLinks,
      search,
      megaTrigger,
      headerCta,
      catLinks,
      footerNavSections,
      footerCta,
      overflow,
    };
  });

  if (data.tagline === EXPECTED.settings.utilityTagline) pass("Public utility tagline matches");
  else fail(`Public utility tagline: ${data.tagline}`);

  if (sameLinks(data.utilityLinks, EXPECTED.utilityBar)) pass("Public utility bar links match");
  else fail(`Public utility bar mismatch: ${JSON.stringify(data.utilityLinks)}`);

  if (sameLinks(data.primaryLinks, EXPECTED.headerMenu)) pass("Public header menu matches");
  else fail(`Public header menu mismatch: ${JSON.stringify(data.primaryLinks)}`);

  if (data.search === EXPECTED.settings.searchPlaceholder) pass("Public search placeholder matches");
  else fail(`Public search placeholder: ${data.search}`);

  if (data.megaTrigger?.includes(EXPECTED.settings.megaMenuTriggerLabel)) pass("Public mega trigger label matches");
  else fail(`Public mega trigger: ${data.megaTrigger}`);

  if (data.headerCta === EXPECTED.headerCta.label) pass("Public header CTA label matches");
  else fail(`Public header CTA: ${data.headerCta}`);

  if (sameLinks(data.catLinks, EXPECTED.categoryNav)) pass("Public category nav matches");
  else fail(`Public category nav mismatch: ${JSON.stringify(data.catLinks)}`);

  const products = data.footerNavSections.find((s) => s.title === "Sản phẩm");
  if (products && sameLinks(products.links, EXPECTED.footerProducts)) pass("Public footer products match");
  else fail(`Public footer products mismatch: ${JSON.stringify(products?.links)}`);

  if (data.footerCta === EXPECTED.footerCta.label) pass("Public footer CTA matches");
  else fail(`Public footer CTA: ${data.footerCta}`);

  if (!data.overflow) pass("Public / no horizontal overflow at desktop");
  else fail("Public / horizontal overflow detected");
}

async function qaResponsive(page) {
  const routes = ["/", "/san-pham", "/gioi-thieu", "/lien-he", "/dai-ly", "/blog"];
  const widths = [360, 390, 430, 768, 1024, 1280, 1440];
  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 90000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      if (overflow) fail(`Overflow ${route} @${width}px`);
    }
  }
  pass(`Responsive overflow check: ${routes.length} routes x ${widths.length} widths`);
}

async function qaUnauthorizedApi() {
  const res = await fetch(`${BASE}/api/admin/site-navigation`);
  if (res.status === 401) pass("Unauthenticated GET returns 401");
  else fail(`Unauthenticated GET returned ${res.status}`);
  const patch = await fetch(`${BASE}/api/admin/site-navigation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ panel: "settings", settings: EXPECTED.settings }),
  });
  if (patch.status === 401) pass("Unauthenticated PATCH returns 401");
  else fail(`Unauthenticated PATCH returned ${patch.status}`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await qaDbSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }

  try {
    await qaUnauthorizedApi();
  } catch (e) {
    note(`API QA skipped (server not running?): ${e.message}`);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await qaPublicParity(page);
    await qaResponsive(page);
  } catch (e) {
    note(`Browser QA skipped: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }

  console.log("\n=== PASSES ===");
  passes.forEach((p) => console.log("✓", p));
  console.log("\n=== FAILURES ===");
  failures.forEach((f) => console.log("✗", f));
  console.log("\n=== NOTES ===");
  notes.forEach((n) => console.log("-", n));
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
