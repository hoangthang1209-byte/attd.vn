/**
 * Admin sidebar DOM audit — local investigation only, do not commit.
 * Run: ADMIN_PASSWORD=... node scripts/admin-nav-dom-audit.mjs [baseUrl]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || process.env.QA_BASE_URL || "http://localhost:3462";
const PASSWORD = process.env.ADMIN_PASSWORD || "dom-audit-local-2026";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = path.join(process.cwd(), ".admin-nav-dom-audit");
const LABELS = ["Homepage", "Điều hướng và Footer"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const BROWSER_AUDIT_FN = (labels) => {
  const cssPath = (el) => {
    if (!el || el.nodeType !== 1) return String(el);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 8) {
      let part = node.tagName.toLowerCase();
      if (node.id) part += `#${node.id}`;
      else if (node.className && typeof node.className === "string") {
        const cls = node.className.trim().split(/\s+/).slice(0, 2).join(".");
        if (cls) part += `.${cls}`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const inspectLink = (label) => {
    const nav = document.getElementById("admin-primary-navigation");
    const link = [...(nav?.querySelectorAll("a") ?? [])].find((a) => a.textContent?.trim() === label);
    const disabled = [...(nav?.querySelectorAll("[aria-disabled='true']") ?? [])].find((el) =>
      el.textContent?.includes(label),
    );
    const target = link || disabled;
    if (!target) return { label, found: false };

    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(cx, cy);

    const chain = [];
    let node = target;
    while (node && node instanceof Element && chain.length < 12) {
      const cs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      chain.push({
        tag: node.tagName,
        id: node.id || null,
        className: typeof node.className === "string" ? node.className : null,
        href: node.getAttribute?.("href"),
        ariaDisabled: node.getAttribute?.("aria-disabled"),
        rect: { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom },
        computed: {
          position: cs.position,
          zIndex: cs.zIndex,
          pointerEvents: cs.pointerEvents,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
          transform: cs.transform,
          opacity: cs.opacity,
          display: cs.display,
          visibility: cs.visibility,
        },
        pseudoBefore: (() => {
          const p = getComputedStyle(node, "::before");
          return { content: p.content, position: p.position, pointerEvents: p.pointerEvents };
        })(),
        pseudoAfter: (() => {
          const p = getComputedStyle(node, "::after");
          return { content: p.content, position: p.position, pointerEvents: p.pointerEvents };
        })(),
      });
      node = node.parentElement;
    }

    return {
      label,
      found: true,
      element: {
        tag: target.tagName,
        href: target.getAttribute?.("href"),
        ariaDisabled: target.getAttribute?.("aria-disabled"),
        className: target.className,
        cssPath: cssPath(target),
      },
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, cx, cy },
      elementFromPoint: hit
        ? {
            tag: hit.tagName,
            id: hit.id || null,
            className: hit.className || null,
            href: hit.getAttribute?.("href"),
            text: hit.textContent?.trim().slice(0, 80) || null,
            cssPath: cssPath(hit),
            sameAsTarget: hit === target,
            targetContainsHit: target.contains(hit),
            hitContainsTarget: hit.contains?.(target) ?? false,
          }
        : null,
      ancestorChain: chain,
    };
  };

  const sidebarTop = document.querySelector('[class*="sidebarTop"]');
  let sidebarTopInfo = null;
  if (sidebarTop) {
    const cs = getComputedStyle(sidebarTop);
    const r = sidebarTop.getBoundingClientRect();
    sidebarTopInfo = {
      className: sidebarTop.className,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom },
      computed: {
        position: cs.position,
        zIndex: cs.zIndex,
        pointerEvents: cs.pointerEvents,
        top: cs.top,
        background: cs.background,
      },
    };
  }

  return {
    sidebarTop: sidebarTopInfo,
    homepage: inspectLink(labels[0]),
    siteNavigation: inspectLink(labels[1]),
  };
};

async function scrollToSiteNav(page) {
  await page.evaluate(() => {
    const target = [...document.querySelectorAll("#admin-primary-navigation a")].find(
      (a) => a.textContent?.trim() === "Điều hướng và Footer",
    );
    target?.scrollIntoView({ block: "center" });
  });
  await sleep(500);
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

  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.type('input[type="password"]', PASSWORD, { delay: 5 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => null),
  ]);
  await sleep(2500);

  if (page.url().includes("/admin/login")) {
    throw new Error(`Login failed — still on ${page.url()}`);
  }

  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(2000);
  await scrollToSiteNav(page);

  const beforeRemoval = await page.evaluate(BROWSER_AUDIT_FN, LABELS);
  await page.screenshot({ path: path.join(OUT_DIR, "before-sidebarTop-removal.png"), fullPage: false });

  const clickBefore = await page.evaluate(async () => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
      (a) => a.textContent?.trim() === "Điều hướng và Footer",
    );
    if (!link) return { found: false };
    const beforeUrl = location.href;
    let defaultPrevented = false;
    const handler = (e) => {
      if (e.defaultPrevented) defaultPrevented = true;
    };
    link.addEventListener("click", handler, { capture: true });
    link.click();
    link.removeEventListener("click", handler, { capture: true });
    await new Promise((r) => setTimeout(r, 100));
    return {
      found: true,
      href: link.href,
      beforeUrl,
      afterUrl: location.href,
      navigated: location.href !== beforeUrl,
      defaultPrevented,
    };
  });
  await sleep(1500);
  const urlAfterClickBefore = page.url();

  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1500);
  await scrollToSiteNav(page);

  await page.evaluate(() => {
    document.querySelector('[class*="sidebarTop"]')?.remove();
  });
  await sleep(300);

  const afterRemoval = await page.evaluate(BROWSER_AUDIT_FN, LABELS);
  await page.screenshot({ path: path.join(OUT_DIR, "after-sidebarTop-removal.png"), fullPage: false });

  const clickAfter = await page.evaluate(async () => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
      (a) => a.textContent?.trim() === "Điều hướng và Footer",
    );
    if (!link) return { found: false };
    const beforeUrl = location.href;
    link.click();
    await new Promise((r) => setTimeout(r, 100));
    return {
      found: true,
      href: link.href,
      beforeUrl,
      afterUrl: location.href,
      navigated: location.href !== beforeUrl,
    };
  });
  await sleep(1500);

  const report = {
    base: BASE,
    beforeRemoval,
    clickTestBeforeRemoval: { ...clickBefore, finalUrl: urlAfterClickBefore },
    afterRemoval,
    clickTestAfterSidebarTopRemoval: { ...clickAfter, finalUrl: page.url() },
    screenshots: {
      before: path.join(OUT_DIR, "before-sidebarTop-removal.png"),
      after: path.join(OUT_DIR, "after-sidebarTop-removal.png"),
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
