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
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => null),
  ]);
  await sleep(2000);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const cookies = await page.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const rscHeaders = {
    cookie: cookieHeader,
    rsc: "1",
    "next-router-state-tree": encodeURIComponent(
      '["",{"children":["(backend)",{"children":["admin",{"children":["dashboard",{"children":["__PAGE__",{}]}]}]}]},null,null,true]',
    ),
  };

  for (const path of ["/admin/settings/homepage", "/admin/site-navigation", "/admin/landing-pages"]) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { ...rscHeaders, Accept: "text/x-component" },
    });
    const text = await res.text();
    console.log(path, res.status, text.slice(0, 200).replace(/\n/g, " "));
  }

  // Click with long wait for response
  const events = [];
  page.on("response", (res) => {
    if (res.url().includes("site-navigation"))
      events.push({ status: res.status(), url: res.url(), t: Date.now() });
  });
  await page.evaluate(() => {
    [...document.querySelectorAll("#admin-primary-navigation a")]
      .find((a) => a.textContent?.includes("Điều hướng"))
      ?.scrollIntoView({ block: "center" });
  });
  await sleep(300);
  const t0 = Date.now();
  await page.evaluate(() => {
    document.querySelector('#admin-primary-navigation a[href="/admin/site-navigation"]')?.click();
  });
  await sleep(15000);
  console.log(
    "click wait 15s",
    JSON.stringify({ url: page.url(), events, elapsed: Date.now() - t0 }),
  );

  await browser.close();
}

main().catch(console.error);
