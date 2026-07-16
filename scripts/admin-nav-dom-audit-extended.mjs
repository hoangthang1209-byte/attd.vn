/**
 * Extended admin sidebar DOM audit — pointer clicks + scroll sweep.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3462";
const PASSWORD = process.env.ADMIN_PASSWORD || "dom-audit-local-2026";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = path.join(process.cwd(), ".admin-nav-dom-audit");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.type('input[type="password"]', PASSWORD, { delay: 5 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => null),
  ]);
  await sleep(2000);
  if (page.url().includes("/admin/login")) throw new Error("Login failed");
}

async function auditAtScroll(page, scrollTop) {
  await page.evaluate((st) => {
    const sidebar = document.querySelector('[class*="sidebar"]');
    if (sidebar) sidebar.scrollTop = st;
  }, scrollTop);
  await sleep(200);

  return page.evaluate((labels) => {
    const sidebar = document.querySelector('[class*="sidebar"]');
    const sidebarTop = document.querySelector('[class*="sidebarTop"]');
    const stRect = sidebarTop?.getBoundingClientRect();
    const inspect = (label) => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
        (a) => a.textContent?.trim() === label,
      );
      if (!link) return { label, found: false };
      const rect = link.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const underSidebarTop =
        stRect && rect.top < stRect.bottom && rect.bottom > stRect.top && rect.left < stRect.right;
      return {
        label,
        found: true,
        href: link.getAttribute("href"),
        rect: { top: rect.top, bottom: rect.bottom, cx, cy },
        hit: hit
          ? {
              tag: hit.tagName,
              className: hit.className,
              href: hit.getAttribute("href"),
              text: hit.textContent?.trim().slice(0, 50),
              isLink: hit === link,
            }
          : null,
        underSidebarTop,
        sidebarScrollTop: sidebar?.scrollTop ?? null,
      };
    };
    return {
      scrollTop: sidebar?.scrollTop ?? null,
      sidebarTop: stRect
        ? { top: stRect.top, bottom: stRect.bottom, height: stRect.height }
        : null,
      homepage: inspect(labels[0]),
      siteNavigation: inspect(labels[1]),
    };
  }, ["Homepage", "Điều hướng và Footer"]);
}

async function mouseClickLink(page, label) {
  const coords = await page.evaluate((lbl) => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
      (a) => a.textContent?.trim() === lbl,
    );
    if (!link) return null;
    const r = link.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, href: link.href };
  }, label);
  if (!coords) return { found: false };
  const before = page.url();
  await page.mouse.click(coords.cx, coords.cy);
  await sleep(2000);
  return { found: true, label, ...coords, beforeUrl: before, afterUrl: page.url(), navigated: page.url() !== before };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await login(page);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1500);

  const maxScroll = await page.evaluate(() => {
    const s = document.querySelector('[class*="sidebar"]');
    return s ? s.scrollHeight - s.clientHeight : 0;
  });

  const scrollSweep = [];
  for (const st of [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, maxScroll]) {
    scrollSweep.push(await auditAtScroll(page, st));
  }

  // Default scroll (0) — real mouse clicks
  await page.evaluate(() => {
    const s = document.querySelector('[class*="sidebar"]');
    if (s) s.scrollTop = 0;
  });
  await sleep(300);
  const clickHomeAt0 = await mouseClickLink(page, "Homepage");
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1000);
  await page.evaluate(() => {
    const s = document.querySelector('[class*="sidebar"]');
    if (s) s.scrollTop = 0;
  });
  await sleep(300);
  const clickSiteAt0 = await mouseClickLink(page, "Điều hướng và Footer");

  // Scroll until site nav is under sidebarTop
  const overlapScroll = scrollSweep.find(
    (s) =>
      s.siteNavigation.found &&
      s.siteNavigation.hit &&
      !s.siteNavigation.hit.isLink &&
      s.homepage.found &&
      s.homepage.hit?.isLink,
  );

  let clickAtOverlap = null;
  if (overlapScroll) {
    await auditAtScroll(page, overlapScroll.scrollTop);
    await page.screenshot({
      path: path.join(OUT_DIR, "overlap-scroll.png"),
      fullPage: false,
    });
    clickAtOverlap = await mouseClickLink(page, "Điều hướng và Footer");
  }

  // Test removing sidebarTop at problematic scroll
  const badScroll =
    overlapScroll?.scrollTop ??
    scrollSweep.find((s) => s.siteNavigation.found && s.siteNavigation.underSidebarTop)?.scrollTop ??
    400;
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1000);
  await auditAtScroll(page, badScroll);
  const beforeRemoveClick = await mouseClickLink(page, "Điều hướng và Footer");
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1000);
  await auditAtScroll(page, badScroll);
  await page.evaluate(() => document.querySelector('[class*="sidebarTop"]')?.remove());
  await sleep(200);
  const afterRemoveAudit = await page.evaluate((labels) => {
    const inspect = (label) => {
      const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
        (a) => a.textContent?.trim() === label,
      );
      if (!link) return { found: false };
      const r = link.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        label,
        rect: { top: r.top, cy },
        hit: hit ? { tag: hit.tagName, className: hit.className, isLink: hit === link } : null,
      };
    };
    return { homepage: inspect(labels[0]), siteNavigation: inspect(labels[1]) };
  }, ["Homepage", "Điều hướng và Footer"]);
  const afterRemoveClick = await mouseClickLink(page, "Điều hướng và Footer");

  const report = {
    maxScroll,
    scrollSweep,
    overlapScrollFound: overlapScroll ?? null,
    mouseClicks: {
      homepageAtScroll0: clickHomeAt0,
      siteNavAtScroll0: clickSiteAt0,
      siteNavAtOverlapScroll: clickAtOverlap,
      siteNavBeforeSidebarTopRemoval: beforeRemoveClick,
      siteNavAfterSidebarTopRemoval: afterRemoveClick,
    },
    afterRemoveAudit,
  };

  fs.writeFileSync(path.join(OUT_DIR, "extended-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
