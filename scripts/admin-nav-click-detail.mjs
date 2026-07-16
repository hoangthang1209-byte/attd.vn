import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3462";
const PASSWORD = "dom-audit-local-2026";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const preClick = await page.evaluate(() => {
    const links = [...document.querySelectorAll("#admin-primary-navigation a")];
    return links
      .filter((a) => a.getAttribute("href")?.includes("site-navigation") || a.textContent?.includes("Điều hướng"))
      .map((a) => ({
        text: a.textContent?.trim(),
        href: a.getAttribute("href"),
        className: a.className,
        rect: a.getBoundingClientRect(),
        active: a.className.includes("navLinkActive"),
        parentText: a.parentElement?.previousElementSibling?.textContent?.trim(),
      }));
  });

  await page.evaluate(() => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
      a.textContent?.trim().includes("Điều hướng và Footer"),
    );
    link?.scrollIntoView({ block: "center" });
  });
  await sleep(500);

  const clickDetail = await page.evaluate(() => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
      a.textContent?.trim().includes("Điều hướng và Footer"),
    );
    const r = link.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const stack = document.elementsFromPoint(cx, cy).slice(0, 8).map((el) => ({
      tag: el.tagName,
      className: el.className,
      href: el.getAttribute?.("href"),
      text: el.textContent?.trim().slice(0, 40),
    }));
    return { cx, cy, stack, linkHref: link.href, linkOnClick: link.onclick?.toString() ?? null };
  });

  await page.mouse.click(clickDetail.cx, clickDetail.cy);
  await sleep(4000);

  const postClick = await page.evaluate(() => ({
    href: location.href,
    pathname: location.pathname,
    h1: document.querySelector("h1")?.textContent?.trim(),
    breadcrumb: [...document.querySelectorAll('[aria-label="Breadcrumb"] span')].map((s) => s.textContent),
    hasSiteNavManager: !!document.body.textContent?.includes("Thanh cuối footer"),
    activeLinks: [...document.querySelectorAll("#admin-primary-navigation a")].filter((a) =>
      a.className.includes("navLinkActive"),
    ).map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute("href") })),
  }));

  // Try selector click
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.evaluate(() => {
    [...document.querySelectorAll("#admin-primary-navigation a")]
      .find((a) => a.textContent?.trim().includes("Điều hướng và Footer"))
      ?.scrollIntoView({ block: "center" });
  });
  await sleep(400);
  const selectorClick = await page.$(
    '#admin-primary-navigation a[href="/admin/site-navigation"]',
  );
  const beforeSel = page.url();
  await selectorClick?.click();
  await sleep(4000);
  const afterSel = {
    url: page.url(),
    h1: await page.$eval("h1", (el) => el.textContent?.trim()).catch(() => null),
  };

  console.log(JSON.stringify({ preClick, clickDetail, postClick, selectorClick: { beforeSel, afterSel } }, null, 2));
  await browser.close();
}

main();
