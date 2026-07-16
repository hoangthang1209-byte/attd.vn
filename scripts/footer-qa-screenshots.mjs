import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3456";
const ROUTES = ["/", "/san-pham", "/lien-he", "/dai-ly"];
const WIDTHS = [360, 768, 1024, 1280];
const OUT_DIR = path.join(process.cwd(), ".footer-qa-screenshots");

const chromePath =
  process.env.CHROME_EXECUTABLE_PATH?.trim() ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();

for (const width of WIDTHS) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });
  for (const route of ROUTES) {
    const slug = route === "/" ? "home" : route.slice(1).replace(/\//g, "-");
    const file = path.join(OUT_DIR, `${slug}-${width}.png`);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 });
      const footer = await page.$("footer.site-footer--enterprise");
      if (!footer) throw new Error("Footer not found");
      await footer.evaluate((el) => el.scrollIntoView({ block: "end" }));
      await new Promise((r) => setTimeout(r, 400));
      await footer.screenshot({ path: file });
      console.log(`OK ${file}`);
    } catch (err) {
      console.error(`FAIL ${route} @${width}:`, err.message);
    }
  }
}

await browser.close();
console.log(`Screenshots saved to ${OUT_DIR}`);
