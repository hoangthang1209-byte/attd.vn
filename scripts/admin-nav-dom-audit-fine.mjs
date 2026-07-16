/**
 * Fine-grained overlap zone + in-viewport pointer click test.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3462";
const PASSWORD = process.env.ADMIN_PASSWORD || "dom-audit-local-2026";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(process.cwd(), ".admin-nav-dom-audit/fine-report.json");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => null),
  ]);
  await sleep(2000);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1500);

  const fineSweep = [];
  for (let st = 2050; st <= 2220; st += 10) {
    await page.evaluate((scroll) => {
      const s = document.querySelector('[class*="sidebar"]');
      if (s) s.scrollTop = scroll;
    }, st);
    await sleep(80);
    const row = await page.evaluate(() => {
      const sidebarTop = document.querySelector('[class*="sidebarTop"]');
      const stR = sidebarTop?.getBoundingClientRect();
      const inspect = (label) => {
        const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
          (a) => a.textContent?.trim() === label,
        );
        if (!link) return { found: false };
        const r = link.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const inViewport = cy >= 0 && cy <= window.innerHeight && cx >= 0 && cx <= window.innerWidth;
        const hit = inViewport ? document.elementFromPoint(cx, cy) : null;
        const overlapsTop =
          stR && r.top < stR.bottom && r.bottom > stR.top && r.left < stR.right && r.right > stR.left;
        return {
          label,
          top: r.top,
          bottom: r.bottom,
          cy,
          inViewport,
          overlapsTop,
          hit: hit
            ? {
                tag: hit.tagName,
                className: hit.className,
                href: hit.getAttribute("href"),
                text: hit.textContent?.trim().slice(0, 40),
                isTarget: hit === link,
              }
            : null,
        };
      };
      return {
        scrollTop: document.querySelector('[class*="sidebar"]')?.scrollTop,
        sidebarTopBottom: stR?.bottom,
        homepage: inspect("Homepage"),
        siteNavigation: inspect("Điều hướng và Footer"),
      };
    });
    fineSweep.push(row);
  }

  const interceptRows = fineSweep.filter(
    (r) =>
      r.siteNavigation.found !== false &&
      r.siteNavigation.hit &&
      !r.siteNavigation.hit.isTarget,
  );

  async function clickVisible(label) {
    await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
    await sleep(1000);
    await page.evaluate((lbl) => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
        (a) => a.textContent?.trim() === lbl,
      );
      link?.scrollIntoView({ block: "center" });
    }, label);
    await sleep(500);
    const info = await page.evaluate((lbl) => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
        (a) => a.textContent?.trim() === lbl,
      );
      const r = link.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        href: link?.href,
        cx,
        cy,
        inViewport: cy >= 0 && cy <= window.innerHeight,
        hitTag: hit?.tagName,
        hitClass: hit?.className,
        hitIsLink: hit === link,
      };
    }, label);
    const before = page.url();
    const navPromise = page
      .waitForFunction(
        (expected) => location.pathname.startsWith(expected),
        { timeout: 8000 },
        label === "Homepage" ? "/admin/settings/homepage" : "/admin/site-navigation",
      )
      .catch(() => null);
    await page.mouse.click(info.cx, info.cy);
    await navPromise;
    await sleep(500);
    return { label, before, after: page.url(), navigated: page.url() !== before, ...info };
  }

  const clickHome = await clickVisible("Homepage");
  const clickSite = await clickVisible("Điều hướng và Footer");

  // Remove sidebarTop at intercept scroll if any
  let removeTopTest = null;
  const badScroll = interceptRows[0]?.scrollTop ?? 2110;
  if (badScroll) {
    await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
    await sleep(1000);
    await page.evaluate((st) => {
      const s = document.querySelector('[class*="sidebar"]');
      if (s) s.scrollTop = st;
    }, badScroll);
    await sleep(200);
    const before = await page.evaluate(() => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
        a.textContent?.includes("Điều hướng và Footer"),
      );
      const r = link.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        hitTag: hit?.tagName,
        hitClass: hit?.className,
        hitIsLink: hit === link,
      };
    });
    await page.evaluate(() => document.querySelector('[class*="sidebarTop"]')?.remove());
    await sleep(100);
    const after = await page.evaluate(() => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
        a.textContent?.includes("Điều hướng và Footer"),
      );
      const r = link.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        hitTag: hit?.tagName,
        hitClass: hit?.className,
        hitIsLink: hit === link,
      };
    });
    const urlBefore = page.url();
    const coords = await page.evaluate(() => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
        a.textContent?.includes("Điều hướng và Footer"),
      );
      const r = link.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
    await page.mouse.click(coords.cx, coords.cy);
    await sleep(2000);
    removeTopTest = { badScroll, before, after, urlBefore, urlAfter: page.url() };
  }

  const report = { fineSweep, interceptRows, clickHome, clickSite, removeTopTest };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
