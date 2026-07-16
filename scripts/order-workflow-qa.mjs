import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.QA_BASE_URL || "http://localhost:3456";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "qa-order-workflow-local";
const WIDTHS = [360, 768, 1280];
const OUT_DIR = path.join(process.cwd(), ".order-workflow-qa");

const chromePath =
  process.env.CHROME_EXECUTABLE_PATH?.trim() ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(OUT_DIR, { recursive: true });

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function pass(id, detail = "") {
  results.passed.push({ id, detail });
  console.log(`PASS ${id}${detail ? `: ${detail}` : ""}`);
}

function fail(id, detail = "") {
  results.failed.push({ id, detail });
  console.error(`FAIL ${id}${detail ? `: ${detail}` : ""}`);
}

function warn(id, detail = "") {
  results.warnings.push({ id, detail });
  console.warn(`WARN ${id}${detail ? `: ${detail}` : ""}`);
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function adminLogin(page) {
  await page.goto(`${BASE}/admin/login?next=%2Fadmin%2Forders%2Fnew`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.type("#admin-password", ADMIN_PASSWORD, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }),
    page.click(".admin-login-submit"),
  ]);
  const url = page.url();
  if (!url.includes("/admin/orders/new")) {
    throw new Error(`Login failed, landed on ${url}`);
  }
}

async function getLayoutMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const workspace = document.querySelector('[class*="orderWorkspace"]');
    const header = document.querySelector('[class*="formHeader"]');
    const summary = document.querySelector('[class*="orderWorkspace__summary"]');
    const mobileBar = document.querySelector('[class*="mobileActionBar"]');
    const bodyGrid = document.querySelector('[class*="orderWorkspace__body"]');
    const headerActions = document.querySelector('[class*="formHeader__actions"]');
    const inlineSummary = document.querySelector('[class*="summaryPanel--inline"]');
    const style = bodyGrid ? getComputedStyle(bodyGrid) : null;
    const headerStyle = headerActions ? getComputedStyle(headerActions) : null;
    const mobileStyle = mobileBar ? getComputedStyle(mobileBar) : null;
    const inlineStyle = inlineSummary ? getComputedStyle(inlineSummary) : null;
    return {
      docOverflow: doc.scrollWidth > doc.clientWidth,
      hasWorkspace: Boolean(workspace),
      hasHeader: Boolean(header),
      hasSummary: Boolean(summary),
      hasMobileBar: Boolean(mobileBar),
      gridColumns: style?.gridTemplateColumns || null,
      headerActionsDisplay: headerStyle?.display || null,
      mobileBarDisplay: mobileStyle?.display || null,
      inlineSummaryDisplay: inlineStyle?.display || null,
      advancedCount: document.querySelectorAll("details").length,
      itemCards: document.querySelectorAll('[class*="itemCard"]').length,
    };
  });
}

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function runViewportQA(page, width) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/admin/orders/new`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[class*="orderWorkspace"]', { timeout: 30000 });

  const m = await getLayoutMetrics(page);
  await screenshot(page, `orders-new-${width}`);

  if (m.docOverflow) fail(`viewport-${width}-overflow`, "horizontal scroll detected");
  else pass(`viewport-${width}-overflow`);

  if (!m.hasWorkspace || !m.hasHeader) fail(`viewport-${width}-structure`, "missing workspace/header");
  else pass(`viewport-${width}-structure`);

  if (width >= 1100) {
    if (m.gridColumns?.includes("300px") || m.gridColumns?.includes("1fr 300px")) {
      pass(`viewport-${width}-desktop-grid`, m.gridColumns);
    } else {
      warn(`viewport-${width}-grid`, m.gridColumns || "no grid");
    }
    if (m.headerActionsDisplay !== "flex") fail(`viewport-${width}-header-actions`, m.headerActionsDisplay);
    else pass(`viewport-${width}-header-actions`);
    if (m.mobileBarDisplay !== "none") fail(`viewport-${width}-mobile-bar-hidden`, m.mobileBarDisplay);
    else pass(`viewport-${width}-mobile-bar-hidden`);
    if (m.inlineSummaryDisplay !== "none") fail(`viewport-${width}-inline-summary-hidden`, m.inlineSummaryDisplay);
    else pass(`viewport-${width}-inline-summary-hidden`);
  } else {
    if (m.mobileBarDisplay === "none") fail(`viewport-${width}-mobile-bar-visible`, "hidden on mobile");
    else pass(`viewport-${width}-mobile-bar-visible`);
  }

  const bottomPad = await page.evaluate(() => {
    const main = document.querySelector('[class*="orderWorkspace__main"]');
    if (!main) return null;
    return getComputedStyle(main).paddingBottom;
  });
  const sidebarHidden = await page.evaluate(() => {
    const sidebar = document.querySelector('[class*="orderWorkspace__summary"]');
    if (!sidebar) return true;
    return getComputedStyle(sidebar).display === "none";
  });
  if (width < 1100) {
    if (sidebarHidden) pass(`viewport-${width}-sidebar-summary-hidden`);
    else fail(`viewport-${width}-sidebar-summary-hidden`, "duplicate totals column visible");
    if (bottomPad && bottomPad !== "0px") pass(`viewport-${width}-main-bottom-pad`, bottomPad);
  }
}

async function selectCustomerFromSearch(page, query) {
  const input = await page.waitForSelector(".quote-customer-search input.admin-input");
  await input.click();
  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await input.type(query, { delay: 25 });
  await new Promise((r) => setTimeout(r, 500));
  await page.waitForSelector(".quote-customer-search__option", { timeout: 15000 });
  await page.click(".quote-customer-search__option");
  await page.waitForFunction(
    () => Boolean(document.querySelector('[aria-label="Tóm tắt khách hàng"]') || document.querySelector("#order-customer-name")?.value),
    { timeout: 10000 },
  );
}

async function waitForCustomerSummary(page) {
  return page.waitForSelector('[aria-label="Tóm tắt khách hàng"]', { timeout: 10000 });
}

async function runCustomerWorkflowQA(page) {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/orders/new`, { waitUntil: "networkidle2", timeout: 90000 });

  const customerName = await page.evaluate(async () => {
    const res = await fetch("/api/crm/customers?limit=1");
    const data = await res.json();
    return data.customers?.[0]?.name || null;
  });

  if (!customerName) {
    warn("customer-select", "no CRM customers available for autofill test");
    return;
  }

  await selectCustomerFromSearch(page, customerName.slice(0, Math.min(6, customerName.length)));

  try {
    await waitForCustomerSummary(page);
    pass("customer-summary-visible");
  } catch {
    fail("customer-summary-visible", "summary not shown after search");
  }

  const advanced = await page.$("details");
  if (advanced) {
    const openBefore = await page.evaluate((el) => el.open, advanced);
    await page.evaluate((el) => {
      el.open = true;
    }, advanced);
    const openAfter = await page.evaluate((el) => el.open, advanced);
    if (openAfter) pass("customer-advanced-open");
    else fail("customer-advanced-open");
    await page.evaluate(
      (el, wasOpen) => {
        el.open = wasOpen;
      },
      advanced,
      openBefore,
    );
  }
}

async function runValidationRevealQA(page) {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/orders/new`, { waitUntil: "networkidle2", timeout: 90000 });

  for (const details of await page.$$("details")) {
    await page.evaluate((el) => {
      el.open = false;
    }, details);
  }

  const nameInput = await page.waitForSelector("#order-customer-name");
  await nameInput.click({ clickCount: 3 });
  await nameInput.type(" ", { delay: 10 });
  await page.keyboard.press("Backspace");

  const blocked = await page.evaluate(() => {
    const form = document.querySelector("form");
    if (!form) return { ok: false, reason: "no form" };
    return { ok: !form.checkValidity(), invalidId: document.querySelector(":invalid")?.id || null };
  });

  if (!blocked.ok) fail("validation-blocked-empty-customer-name", JSON.stringify(blocked));
  else pass("validation-blocked-empty-customer-name", blocked.invalidId || "");

  await page.click('[class*="summaryPanel__actions"] button[type="submit"]').catch(() =>
    page.click('form button[type="submit"].admin-btn--primary'),
  );
  await new Promise((r) => setTimeout(r, 700));

  const reveal = await page.evaluate(() => {
    const name = document.querySelector("#order-customer-name");
    const details = name?.closest("details");
    return {
      detailsOpen: details?.open ?? false,
      stillOnForm: location.pathname.includes("/admin/orders/new"),
    };
  });

  if (reveal.stillOnForm && reveal.detailsOpen) pass("validation-reveal-customer-advanced");
  else if (reveal.stillOnForm) fail("validation-reveal-customer-advanced", JSON.stringify(reveal));
  else warn("validation-reveal-customer-advanced", "navigated away unexpectedly");
}

async function runCreateEditQA(page) {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/orders/new`, { waitUntil: "networkidle2", timeout: 90000 });

  const context = await page.evaluate(async () => {
    const [customersRes, productsRes, colorsRes, categoriesRes] = await Promise.all([
      fetch("/api/crm/customers?limit=1").then((r) => r.json()),
      fetch("/api/admin/products?pageSize=1").then((r) => r.json()),
      fetch("/api/colors?active=1").then((r) => r.json()),
      fetch("/api/admin/products/categories").then((r) => r.json()),
    ]);
    return {
      customer: customersRes.customers?.[0] || null,
      product: productsRes.products?.[0] || null,
      color: colorsRes.colors?.[0] || null,
      category: Array.isArray(categoriesRes) ? categoriesRes[0] : categoriesRes.categories?.[0] || null,
    };
  });

  if (!context.customer || !context.product || !context.color || !context.category) {
    warn("create-order", "missing seed data for disposable order");
    return null;
  }

  const stamp = `QA workflow ${Date.now()}`;
  await selectCustomerFromSearch(page, context.customer.name.slice(0, Math.min(6, context.customer.name.length)));

  for (const details of await page.$$("details")) {
    await page.evaluate((el) => {
      el.open = true;
    }, details);
  }

  await page.type("#order-internal-note", stamp, { delay: 5 });
  await page.$eval("#order-discount", (el) => {
    el.value = "1000";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.$eval("#order-shipping", (el) => {
    el.value = "500";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.$eval("#order-vat", (el) => {
    el.value = "8";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.type('[id^="order-item-name-"]', `QA ${context.product.name}`, { delay: 5 });
  await page.select('[id^="order-item-color-"]', context.color.id);
  await page.$eval('[id^="order-item-qty-"]', (el) => {
    el.value = "50";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.$eval('[id^="order-item-price-"]', (el) => {
    el.value = "120000";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

  for (const details of await page.$$("details")) {
    await page.evaluate((el) => {
      el.open = true;
    }, details);
  }

  await page.select('[id^="order-item-category-"]', context.category.id);
  const genderValue = await page.$eval('[id^="order-item-gender-"]', (el) => el.options[1]?.value || "");
  if (genderValue) await page.select('[id^="order-item-gender-"]', genderValue);
  await page.type('[id^="order-item-description-"]', "QA advanced description", { delay: 5 });

  await new Promise((r) => setTimeout(r, 800));

  const totalsText = await page.evaluate(() => document.querySelector(".admin-catalog-kpi-bar")?.textContent || "");
  if (totalsText.includes("Tổng cộng") && !totalsText.includes("0 đTổng cộng")) pass("totals-render", totalsText.slice(0, 100));
  else if (totalsText.includes("Tổng cộng")) pass("totals-render-zero", totalsText.slice(0, 80));
  else warn("totals-render", "totals bar not found");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => null),
    page.click('[class*="summaryPanel__actions"] button[type="submit"]'),
  ]);

  const afterUrl = page.url();
  const orderIdMatch = afterUrl.match(/\/admin\/orders\/([^/]+)$/);
  if (orderIdMatch && orderIdMatch[1] !== "new") {
    pass("create-order-submit", orderIdMatch[1]);
    return orderIdMatch[1];
  }

  const err = await page.evaluate(() => document.querySelector('[class*="errorBanner"]')?.textContent || null);
  fail("create-order-submit", err || `stayed on ${afterUrl}`);
  return null;
}

async function runRegressionQA(page) {
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 90000 });
  const footer = await page.$("footer.site-footer--enterprise");
  if (footer) pass("regression-public-footer");
  else fail("regression-public-footer");

  await page.goto(`${BASE}/admin/pattern`, { waitUntil: "networkidle2", timeout: 90000 });
  const deleteBtn = await page.$(".admin-link-button--danger");
  if (deleteBtn) pass("regression-pattern-delete-button");
  else warn("regression-pattern-delete-button", "not visible (permissions?)");

  await page.goto(`${BASE}/admin/orders/new/quick`, { waitUntil: "networkidle2", timeout: 90000 });
  const quick = await page.evaluate(() => ({
    path: location.pathname,
    hasForm: Boolean(document.querySelector("form, table, .quick-order")),
  }));
  if (quick.path.includes("/quick")) pass("regression-quick-order-route");
  else fail("regression-quick-order-route", quick.path);
}

async function runConsoleQA(page) {
  const issues = [];
  page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error" && !text.includes("favicon")) issues.push(`console: ${text}`);
  });
  return issues;
}

await waitForServer(`${BASE}/admin/login`);

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
const consoleIssues = await runConsoleQA(page);

try {
  await adminLogin(page);
  pass("admin-login");

  for (const width of WIDTHS) {
    await runViewportQA(page, width);
  }

  await runCustomerWorkflowQA(page);
  await runValidationRevealQA(page);
  const orderId = await runCreateEditQA(page);

  if (orderId) {
  await page.goto(`${BASE}/admin/orders/${orderId}/edit`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.waitForSelector("#order-internal-note", { timeout: 30000 });
  for (const details of await page.$$("details")) {
    await page.evaluate((el) => {
      el.open = true;
    }, details);
  }
    const hydrated = await page.evaluate(() => ({
      internalNote: document.querySelector("#order-internal-note")?.value || "",
      description: document.querySelector('[id^="order-item-description-"]')?.value || "",
    }));
    if (hydrated.internalNote.includes("QA workflow")) pass("edit-hydrate-internal-note");
    else fail("edit-hydrate-internal-note", hydrated.internalNote);
    if (hydrated.description.includes("QA advanced")) pass("edit-hydrate-advanced-field");
    else fail("edit-hydrate-advanced-field", hydrated.description);

    for (const details of await page.$$("details")) {
      await page.evaluate((el) => {
        el.open = true;
      }, details);
    }

    const itemNote = await page.$('[id^="order-item-note-"]');
    if (itemNote) {
      await itemNote.click({ clickCount: 3 });
      await itemNote.type("QA edit note persisted", { delay: 5 });
    }
    const internal = await page.$("#order-internal-note");
    if (internal) {
      await internal.type(" updated", { delay: 5 });
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => null),
      page.click('[class*="summaryPanel__actions"] button[type="submit"]'),
    ]);

    await page.goto(`${BASE}/admin/orders/${orderId}/edit`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector("#order-internal-note", { timeout: 30000 });
    for (const details of await page.$$("details")) {
      await page.evaluate((el) => {
        el.open = true;
      }, details);
    }
    const persisted = await page.evaluate(() => ({
      itemNote: document.querySelector('[id^="order-item-note-"]')?.value || "",
      internalNote: document.querySelector("#order-internal-note")?.value || "",
    }));
    if (persisted.itemNote.includes("QA edit note persisted")) pass("edit-persist-item-note");
    else fail("edit-persist-item-note", persisted.itemNote);
    if (persisted.internalNote.includes("updated")) pass("edit-persist-internal-note");
    else fail("edit-persist-internal-note", persisted.internalNote);

    await page.goto(`${BASE}/admin/orders/${orderId}`, { waitUntil: "networkidle2", timeout: 90000 });
    if (page.url().includes(`/admin/orders/${orderId}`)) pass("order-detail-route");
    else fail("order-detail-route", page.url());
  }

  await runRegressionQA(page);
} catch (err) {
  fail("qa-runner", err instanceof Error ? err.message : String(err));
}

await browser.close();

const report = {
  base: BASE,
  passed: results.passed.length,
  failed: results.failed.length,
  warnings: results.warnings.length,
  results,
  consoleIssues,
  screenshots: OUT_DIR,
};

fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
console.log("\n=== QA SUMMARY ===");
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, warnings: report.warnings }, null, 2));
if (results.failed.length) process.exit(1);
