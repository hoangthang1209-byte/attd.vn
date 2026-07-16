import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3462";
const PASSWORD = "dom-audit-local-2026";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function monitorClick(page, label) {
  const events = [];
  page.on("request", (req) => {
    if (req.url().includes("site-navigation") || req.url().includes("homepage"))
      events.push({ type: "request", url: req.url(), method: req.method() });
  });
  page.on("requestfailed", (req) =>
    events.push({ type: "failed", url: req.url(), err: req.failure()?.errorText }),
  );
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("site-navigation") && !url.includes("homepage")) return;
    let body = "";
    try {
      body = (await res.text()).slice(0, 300);
    } catch {}
    events.push({ type: "response", status: res.status(), url, body });
  });
  page.on("console", (msg) => events.push({ type: "console", text: msg.text() }));
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) events.push({ type: "navigated", url: frame.url() });
  });

  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.evaluate((lbl) => {
    [...document.querySelectorAll("#admin-primary-navigation a")]
      .find((a) => a.textContent?.trim() === lbl)
      ?.scrollIntoView({ block: "center" });
  }, label);
  await sleep(400);

  const before = page.url();
  await page.evaluate((lbl) => {
    const link = [...document.querySelectorAll("#admin-primary-navigation a")].find(
      (a) => a.textContent?.trim() === lbl,
    );
    link?.click();
  }, label);
  await sleep(5000);

  const after = await page.evaluate(() => ({
    href: location.href,
    h1: document.querySelector("h1")?.textContent?.trim(),
    hasFooterPanel: document.body.textContent?.includes("Thanh cuối footer") ?? false,
  }));

  return { label, before, after, events };
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

  const home = await monitorClick(page, "Homepage");
  const site = await monitorClick(page, "Điều hướng và Footer");

  console.log(JSON.stringify({ home, site }, null, 2));
  await browser.close();
}

main();
