import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3462";
const PASSWORD = "dom-audit-local-2026";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(process.cwd(), ".admin-nav-dom-audit");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testAtScroll(page, scrollTop, removeTop) {
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1000);
  await page.evaluate((st) => {
    const s = document.querySelector('[class*="sidebar"]');
    if (s) s.scrollTop = st;
  }, scrollTop);
  await sleep(200);
  if (removeTop) {
    await page.evaluate(() => document.querySelector('[class*="sidebarTop"]')?.remove());
    await sleep(100);
  }

  const audit = await page.evaluate(() => {
    const inspect = (label) => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
        (a) => a.textContent?.trim() === label,
      );
      if (!link) return { found: false };
      const r = link.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = cy >= 0 && cy <= window.innerHeight ? document.elementFromPoint(cx, cy) : null;
      return {
        found: true,
        top: r.top,
        cy,
        inViewport: cy >= 0 && cy <= window.innerHeight,
        hit: hit
          ? { tag: hit.tagName, className: hit.className, isLink: hit === link, text: hit.textContent?.trim().slice(0, 30) }
          : null,
      };
    };
    return { homepage: inspect("Homepage"), siteNavigation: inspect("Điều hướng và Footer") };
  });

  const shot = path.join(OUT, `overlap-scroll-${scrollTop}${removeTop ? "-no-top" : ""}.png`);
  await page.screenshot({ path: shot });

  const clickSite = await page.evaluate(() => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
      a.textContent?.includes("Điều hướng và Footer"),
    );
    const r = link.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const before = page.url();
  await page.mouse.click(clickSite.cx, clickSite.cy);
  await page
    .waitForFunction(() => location.pathname === "/admin/site-navigation", { timeout: 8000 })
    .catch(() => null);
  await sleep(500);

  return {
    scrollTop,
    removeTop,
    audit,
    screenshot: shot,
    click: { before, after: page.url(), navigated: page.url().includes("/admin/site-navigation") },
  };
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => null),
  ]);
  await sleep(2000);

  const results = {
    comfortableScroll: await testAtScroll(page, 1662, false),
    overlapBefore: await testAtScroll(page, 2180, false),
    overlapAfterRemoveTop: await testAtScroll(page, 2180, true),
    homepageAt2180: await testAtScroll(page, 2180, false),
  };

  fs.writeFileSync(path.join(OUT, "overlap-click-report.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main();
