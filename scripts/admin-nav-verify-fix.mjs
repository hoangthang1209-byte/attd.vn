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
  await sleep(3000);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2" });
  await sleep(2000);

  const maxScroll = await page.evaluate(() => {
    const s = document.querySelector('[class*="sidebarNavScroll"]');
    return s ? s.scrollHeight - s.clientHeight : 0;
  });

  const sweep = [];
  for (const st of [0, maxScroll, 2180].filter((v, i, a) => a.indexOf(v) === i)) {
    await page.evaluate((scroll) => {
      const s = document.querySelector('[class*="sidebarNavScroll"]');
      if (s) s.scrollTop = scroll;
    }, st);
    await sleep(200);
    const row = await page.evaluate(() => {
      const inspect = (label) => {
        const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
          (a) => a.textContent?.trim() === label,
        );
        const r = link.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const hit = cy >= 0 && cy <= window.innerHeight ? document.elementFromPoint(cx, cy) : null;
        return {
          top: r.top,
          cy,
          hit: hit ? { tag: hit.tagName, className: hit.className, isLink: hit === link } : null,
        };
      };
      return {
        scrollTop: document.querySelector('[class*="sidebarNavScroll"]')?.scrollTop,
        homepage: inspect("Homepage"),
        siteNavigation: inspect("Điều hướng và Footer"),
      };
    });
    sweep.push(row);
  }

  // click site nav at max scroll
  await page.evaluate((scroll) => {
    const s = document.querySelector('[class*="sidebarNavScroll"]');
    if (s) s.scrollTop = scroll;
    [...document.querySelectorAll("#admin-primary-navigation a")]
      .find((a) => a.textContent?.includes("Điều hướng"))
      ?.scrollIntoView({ block: "start" });
  }, maxScroll);
  await sleep(400);
  const coords = await page.evaluate(() => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find((a) =>
      a.textContent?.includes("Điều hướng"),
    );
    const r = link.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, top: r.top };
  });
  const before = page.url();
  await page.mouse.click(coords.cx, coords.cy);
  await page.waitForFunction(() => location.pathname === "/admin/site-navigation", { timeout: 15000 }).catch(() => null);
  console.log(JSON.stringify({ maxScroll, sweep, coords, before, after: page.url() }, null, 2));
  await browser.close();
}

main();
