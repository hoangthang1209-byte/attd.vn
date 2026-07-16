import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3462";
const PASSWORD = process.env.ADMIN_PASSWORD || "dom-audit-local-2026";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickNavItem(page, label) {
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1000);
  const info = await page.evaluate((lbl) => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
      (a) => a.textContent?.trim() === lbl,
    );
    link?.scrollIntoView({ block: "center" });
    const r = link.getBoundingClientRect();
    return {
      found: !!link,
      href: link?.href,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    };
  }, label);
  await sleep(400);
  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));
  const before = page.url();
  const responses = [];
  page.on("response", (res) => {
    if (res.url().includes("/admin/")) responses.push(`${res.status()} ${res.url()}`);
  });
  await page.mouse.click(info.cx, info.cy);
  await sleep(3000);
  return { label, ...info, before, after: page.url(), navigated: page.url() !== before, logs: logs.slice(-20), responses: responses.slice(-10) };
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

  const direct = await page.goto(`${BASE}/admin/site-navigation`, { waitUntil: "networkidle2", timeout: 120000 });
  const directResult = {
    status: direct?.status(),
    url: page.url(),
    title: await page.title(),
    hasManager: await page.evaluate(() => !!document.body?.textContent?.includes("Điều hướng và Footer")),
  };

  const items = ["Homepage", "Điều hướng và Footer", "Landing Page", "Blog"];
  const clicks = [];
  for (const label of items) clicks.push(await clickNavItem(page, label));

  console.log(JSON.stringify({ directResult, clicks }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
