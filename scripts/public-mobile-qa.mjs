import { chromium, devices } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

// Read-only public QA: never submits leads or connects to a database.
const configuredBase = process.env.QA_BASE_URL;
if (!configuredBase || !/^https?:\/\//.test(configuredBase)) throw new Error("Set QA_BASE_URL to the deployment to verify");
const base = new URL(configuredBase).origin;
const shareUrl = process.env.QA_PREVIEW_SHARE_URL;
let shareToken;
if (shareUrl) {
  let parsed;
  try { parsed = new URL(shareUrl); } catch { throw new Error("Invalid QA preview share URL"); }
  if (parsed.origin !== base || !parsed.searchParams.get("_vercel_share")) {
    throw new Error("QA preview share URL must match the target origin and include its share parameter");
  }
  shareToken = parsed.searchParams.get("_vercel_share");
}
const redact = value => {
  let result = String(value);
  for (const secret of [shareUrl, shareToken, shareToken && encodeURIComponent(shareToken)].filter(Boolean)) {
    result = result.split(secret).join("[REDACTED]");
  }
  return result.replace(/([?&]_vercel_share=)[^\s&#"]+/g, "$1[REDACTED]");
};
const output = process.env.QA_OUTPUT_DIR || "test-results/public-mobile";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {});
const context = await browser.newContext({ ...devices["iPhone 15 Pro"], viewport: { width: 393, height: 852 } });
const routes = ["/", "/dong-phuc-doanh-nghiep", "/nguon-hang", "/oem", "/qua-tang-doanh-nghiep", "/merchandise", "/san-pham", "/danh-muc-san-pham", "/ao-thun-tron", "/ao-polo-tron", "/san-pham/ao-thun-cotton-4-chieu-cao-cap", "/lien-he"];
const report = { base, commit: process.env.GITHUB_SHA || null, viewport: { width: 393, height: 852 }, results: [], failures: [] };
const probeOnly = process.env.QA_PROBE_ONLY === "1";
function check(ok, route, name, detail) {
  if (!ok) report.failures.push({ route, name, detail });
}
try {
  // Establish access once; every route reuses this context's cookies.
  if (shareUrl) {
    const accessPage = await context.newPage();
    try {
      await accessPage.goto(shareUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await accessPage.locator(".public-main main").waitFor({ timeout: 30000 });
      if (new URL(accessPage.url()).origin !== base) throw new Error("Unexpected preview origin");
    } catch {
      report.failures.push({ route: "/", name: "preview authentication", detail: "Shared preview did not reach the ATTD public website" });
      throw new Error("Preview authentication failed; no mobile acceptance was run");
    } finally { await accessPage.close(); }
  }
  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(redact(error.message)));
    // Fail closed if any UI interaction tries to create/update data.
    await page.route("**/*", request => ["GET", "HEAD", "OPTIONS"].includes(request.request().method()) ? request.continue() : request.abort());
    try {
      const response = await page.goto(new URL(route, base).href, { waitUntil: "networkidle", timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      const identity = await page.evaluate(() => ({ title: document.title, location: location.origin + location.pathname, heading: document.querySelector("h1")?.textContent, main: !!document.querySelector(".public-main main"), text: document.body.innerText.slice(0, 240) }));
      console.log(redact(`PAGE ${route} ${JSON.stringify(identity)}`));
      if (!identity.main) throw new Error(`Expected ATTD public main; received ${JSON.stringify(identity)}`);
      check(response?.ok(), route, "HTTP", response?.status());
      if (probeOnly) break;
      check(await page.locator("h1").count() === 1, route, "single visible page heading", await page.locator("h1").allTextContents());
      // Load lazy media through the entire page before inspecting fallbacks.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 60));
        }
        window.scrollTo(0, 0);
      });
      const metrics = await page.evaluate(() => {
        const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
        const headings = [...document.querySelectorAll("h1,h2,h3")].filter(visible);
        return {
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          clipped: headings.filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.textContent),
          headingLines: headings.map(el => ({ text: el.textContent, lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) })),
          cards: [...document.querySelectorAll(".product-card")].map(el => ({ title: el.querySelector("h3")?.textContent, height: Math.round(el.getBoundingClientRect().height) })),
          placeholders: [...document.querySelectorAll(".image-placeholder")].filter(visible).map(el => el.textContent.trim()),
          brokenImages: [...document.images].filter(el => visible(el) && el.complete && !el.naturalWidth && el.alt).map(el => el.alt),
          demoLinks: [...document.querySelectorAll("a")].filter(el => /example\.com|\[demo\]/i.test(el.href + el.textContent)).map(el => el.textContent),
        };
      });
      check(metrics.width === 393 && metrics.scrollWidth <= 395, route, "horizontal overflow", metrics);
      check(!metrics.clipped.length, route, "text clipping", metrics.clipped);
      check(metrics.headingLines.every(h => h.lines <= 7), route, "excessive heading wrapping", metrics.headingLines.filter(h => h.lines > 7));
      check(metrics.cards.every(card => card.height <= 620), route, "product card exceeds 620px budget", metrics.cards.filter(card => card.height > 620));
      check(!metrics.brokenImages.length, route, "broken image", metrics.brokenImages);
      check(!metrics.demoLinks.length, route, "demo content", metrics.demoLinks);
      check(!metrics.placeholders.some(text => /^ATTD\s*ATTD$/.test(text)), route, "generic product fallback", metrics.placeholders);
      if (route === "/" || routes.slice(1, 6).includes(route)) {
        const heroCta = page.locator(".v7-home-hero__actions a, .v7-solution-hero__actions a").first();
        const rect = await heroCta.boundingBox();
        check(rect && rect.y + rect.height <= 852, route, "hero CTA below first viewport", rect);
      }
      // Bring each conversion control into view and check hit-testing against fixed overlays.
      for (const control of await page.locator("main .product-card-quote-btn, main a.v7-btn--primary, main button[type=submit]").all()) {
        await control.scrollIntoViewIfNeeded();
        const reachable = await control.evaluate(el => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return top && (el.contains(top) || top.contains(el));
        });
        check(reachable, route, "sticky CTA covers conversion control", await control.textContent());
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `${route === "/" ? "home" : route.slice(1).replaceAll("/", "--")}.png`), fullPage: true });
      // At the footer, fixed CTA must not obscure the last content/links.
      await page.locator("footer").last().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const obscured = await page.locator("footer a").evaluateAll(links => links.filter(link => {
        const r = link.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= innerHeight || !r.width || !r.height) return false;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return top && !link.contains(top) && !top.contains(link);
      }).map(link => link.textContent));
      check(!obscured.length, route, "sticky CTA covers footer links", obscured);
      check(!errors.length, route, "runtime errors", errors);
      if (route === "/") {
        await page.evaluate(() => window.scrollTo(0, 0));
        const toggle = page.getByRole("button", { name: "Mở menu", exact: true });
        await toggle.click();
        const menu = page.locator("#v7-mobile-navigation");
        check(await menu.isVisible(), route, "mobile menu opens");
        const drawer = await menu.boundingBox();
        check(drawer && drawer.y + drawer.height <= 854, route, "menu fits viewport", drawer);
        check(await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden"), route, "menu locks body scroll");
        await menu.screenshot({ path: path.join(output, "mobile-menu.png") });
        await page.keyboard.press("Escape");
        check(await menu.count() === 0, route, "Escape closes mobile menu");
        check(await toggle.evaluate(el => el === document.activeElement), route, "menu focus restored");
        await toggle.click();
        await menu.getByRole("link", { name: /Nhận tư vấn/ }).click();
        await page.waitForURL("**/lien-he");
        check(await menu.count() === 0, route, "menu navigation closes drawer");
      }
      report.results.push({ route, metrics, errors });
      console.log(`CHECKED ${route} cards=${metrics.cards.length} overflow=${metrics.scrollWidth - metrics.width}`);
    } catch (error) {
      report.failures.push({ route, name: "navigation/interaction", detail: redact(error.message) });
      if (await page.locator(".public-main main").count()) await page.screenshot({ path: path.join(output, `failed-${route === "/" ? "home" : route.slice(1).replaceAll("/", "--")}.png`), fullPage: true }).catch(() => {});
      if (/Expected ATTD public main/.test(error.message)) break;
    } finally { await page.close(); }
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, "report.json"), redact(JSON.stringify(report, null, 2)));
}
console.log(redact(JSON.stringify({ checked: report.results.length, failures: report.failures }, null, 2)));
process.exitCode = probeOnly ? (report.failures.length ? 1 : 0) : report.failures.length || report.results.length !== routes.length ? 1 : 0;
