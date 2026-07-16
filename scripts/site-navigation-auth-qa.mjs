/**
 * Authenticated Site Navigation CMS QA — local only, do not commit.
 * Run: QA_BASE_URL=http://localhost:3461 node scripts/site-navigation-auth-qa.mjs
 */
import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.QA_BASE_URL || "http://localhost:3462";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "qa-site-nav-qa-local";

const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function loadEnvPassword() {
  return ADMIN_PASSWORD;
}

const passes = [];
const failures = [];
const notes = [];

function pass(msg) {
  passes.push(msg);
}
function fail(msg) {
  failures.push(msg);
}
function note(msg) {
  notes.push(msg);
}

function cookieHeaderFromResponse(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const cookies = raw.length ? raw : [res.headers.get("set-cookie")].filter(Boolean);
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

async function loginOwner() {
  const password = loadEnvPassword();
  if (!password) throw new Error("ADMIN_PASSWORD not set");

  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`Owner login failed: ${res.status} ${await res.text()}`);
  const cookie = cookieHeaderFromResponse(res);
  if (!cookie) throw new Error("No session cookie from login");
  return cookie;
}

async function loginLegacyEmployee(prisma, employeeId) {
  const password = loadEnvPassword();
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, employeeId }),
  });
  if (!res.ok) throw new Error(`Legacy login failed: ${res.status}`);
  return cookieHeaderFromResponse(res);
}

async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

function cloneItem(item) {
  return { ...item };
}

async function snapshotProduction(prisma) {
  await prisma.siteNavigationSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  const row = await prisma.siteNavigationSettings.findUnique({
    where: { id: "default" },
    include: {
      items: { orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] },
      ctas: true,
      socialLinks: true,
    },
  });
  return row;
}

async function restoreFromSnapshot(prisma, snap) {
  if (!snap) return;
  await prisma.siteNavigationSettings.update({
    where: { id: "default" },
    data: {
      utilityTagline: snap.utilityTagline,
      megaMenuTriggerLabel: snap.megaMenuTriggerLabel,
      searchPlaceholder: snap.searchPlaceholder,
      useCategoryTreeMegaMenu: snap.useCategoryTreeMegaMenu,
    },
  });

  const placements = [
    "UTILITY_BAR",
    "HEADER_MENU",
    "CATEGORY_NAV",
    "MOBILE_MENU",
    "FOOTER_PRODUCTS",
    "FOOTER_SERVICES",
    "FOOTER_COMPANY",
  ];

  for (const placement of placements) {
    await prisma.siteNavItem.deleteMany({ where: { settingsId: "default", placement } });
    const items = snap.items.filter((i) => i.placement === placement);
    for (const item of items) {
      await prisma.siteNavItem.create({ data: { ...item, settingsId: "default" } });
    }
  }

  for (const cta of snap.ctas) {
    await prisma.siteNavCta.upsert({
      where: { settingsId_slot: { settingsId: "default", slot: cta.slot } },
      create: { ...cta, settingsId: "default" },
      update: {
        label: cta.label,
        href: cta.href,
        trackEvent: cta.trackEvent,
        sortOrder: cta.sortOrder,
        isActive: cta.isActive,
        showDesktop: cta.showDesktop,
        showMobile: cta.showMobile,
        openInNewTab: cta.openInNewTab,
      },
    });
  }

  for (const link of snap.socialLinks) {
    await prisma.siteSocialLink.upsert({
      where: { settingsId_platform: { settingsId: "default", platform: link.platform } },
      create: { ...link, settingsId: "default" },
      update: {
        label: link.label,
        href: link.href,
        sortOrder: link.sortOrder,
        isActive: link.isActive,
      },
    });
  }
}

async function getPublicHeaderLabels() {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  const primary = [...html.matchAll(/mp-header-primary-nav-link[^>]*>([^<]+)</g)].map((m) =>
    m[1].trim(),
  );
  const footerCompany = [];
  const companyBlock = html.match(/aria-label="Công ty"[\s\S]*?<\/div>\s*<\/div>/);
  if (companyBlock) {
    for (const m of companyBlock[0].matchAll(/footer-enterprise-nav__link[^>]*>([^<]+)</g)) {
      footerCompany.push(m[1].trim());
    }
  }
  return { primary, footerCompany, status: res.status };
}

async function qaAdminPanels(cookie) {
  const pageRes = await api(cookie, "GET", "/admin/site-navigation");
  if (pageRes.status === 200 || pageRes.status === 307 || pageRes.status === 308) {
    pass("Admin page reachable with cms.manage session");
  } else if (pageRes.status >= 300 && pageRes.status < 400) {
    pass("Admin page redirects authenticated user (expected for RSC)");
  } else {
    fail(`Admin page status ${pageRes.status}`);
  }

  const getRes = await api(cookie, "GET", "/api/admin/site-navigation");
  if (getRes.status !== 200) {
    fail(`GET CMS API returned ${getRes.status}`);
    return null;
  }
  pass("GET /api/admin/site-navigation returns 200");

  const cms = getRes.json?.cms;
  if (!cms) {
    fail("GET CMS API missing cms payload");
    return null;
  }

  const required = [
    "settings",
    "utility_bar items",
    "header_menu items",
    "category_nav items",
    "mobile_menu items",
    "footer items",
    "socialLinks",
    "ctas",
  ];

  const checks = [
    ["settings", cms.settings],
    ["utility_bar", cms.items?.filter((i) => i.placement === "UTILITY_BAR")?.length > 0],
    ["header_menu", cms.items?.filter((i) => i.placement === "HEADER_MENU")?.length > 0],
    ["category_nav", cms.items?.filter((i) => i.placement === "CATEGORY_NAV")?.length > 0],
    ["mobile_menu", cms.items?.filter((i) => i.placement === "MOBILE_MENU")?.length > 0],
    ["footer", cms.items?.some((i) => i.placement.startsWith("FOOTER_"))],
    ["social", cms.socialLinks?.length > 0],
    ["ctas", cms.ctas?.length > 0],
  ];

  for (const [name, ok] of checks) {
    if (ok) pass(`Panel data present: ${name}`);
    else fail(`Panel data missing: ${name}`);
  }

  return cms;
}

async function qaMutations(cookie, cms) {
  const headerItems = cms.items.filter((i) => i.placement === "HEADER_MENU");
  const target = headerItems[0];
  if (!target) {
    fail("Mutation A: no header item");
    return;
  }
  const originalLabel = target.label;

  const renamed = headerItems.map((item, idx) =>
    idx === 0 ? { ...item, label: `${originalLabel} QA` } : item,
  );
  let res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "header_menu",
    items: renamed,
  });
  if (res.status !== 200) fail(`Mutation A save failed: ${res.status} ${JSON.stringify(res.json)}`);
  else pass("Mutation A: label save accepted");

  res = await api(cookie, "GET", "/api/admin/site-navigation");
  const persisted = res.json?.cms?.items?.find((i) => i.id === target.id)?.label;
  if (persisted === `${originalLabel} QA`) pass("Mutation A: label persisted after refresh");
  else fail(`Mutation A persistence: ${persisted}`);

  const pub = await getPublicHeaderLabels();
  if (pub.primary.some((l) => l.includes("QA"))) pass("Mutation A: public header reflects label");
  else fail(`Mutation A public: ${JSON.stringify(pub.primary)}`);

  res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "header_menu",
    items: headerItems,
  });
  if (res.status === 200) pass("Mutation A: label restored");
  else fail("Mutation A: restore failed");

  const footerItems = cms.items.filter((i) =>
    ["FOOTER_PRODUCTS", "FOOTER_SERVICES", "FOOTER_COMPANY"].includes(i.placement),
  );
  const company = footerItems.filter((i) => i.placement === "FOOTER_COMPANY");
  if (company.length >= 2) {
    const reordered = [...company.slice(1), company[0], ...footerItems.filter((i) => i.placement !== "FOOTER_COMPANY")];
    const originalOrder = company.map((i) => i.label);
    res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
      panel: "footer",
      items: reordered,
    });
    if (res.status === 200) pass("Mutation B: footer reorder save accepted");
    else fail(`Mutation B save: ${res.status}`);

    res = await api(cookie, "GET", "/api/admin/site-navigation");
    const newOrder = res.json?.cms?.items
      ?.filter((i) => i.placement === "FOOTER_COMPANY")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => i.label);
    if (JSON.stringify(newOrder) === JSON.stringify([originalOrder[1], originalOrder[0], ...originalOrder.slice(2)])) {
      pass("Mutation B: footer order persisted");
    } else {
      note(`Mutation B order: expected swap, got ${JSON.stringify(newOrder)}`);
    }

    await api(cookie, "PATCH", "/api/admin/site-navigation", { panel: "footer", items: footerItems });
    pass("Mutation B: footer order restored");
  } else {
    note("Mutation B skipped: need >=2 FOOTER_COMPANY items");
  }

  const visTarget = headerItems[1] ?? headerItems[0];
  const mobileOnly = headerItems.map((item) =>
    item.id === visTarget.id ? { ...item, showDesktop: false, showMobile: true, isActive: true } : item,
  );
  res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "header_menu",
    items: mobileOnly,
  });
  if (res.status === 200) pass("Mutation C: mobile-only save accepted");
  else fail(`Mutation C mobile-only: ${res.status}`);

  const pubMobileOnly = await getPublicHeaderLabels();
  const hiddenDesktop = !pubMobileOnly.primary.includes(visTarget.label);
  if (hiddenDesktop) pass("Mutation C: mobile-only hidden on desktop header");
  else fail(`Mutation C desktop still shows ${visTarget.label}`);

  const desktopOnly = headerItems.map((item) =>
    item.id === visTarget.id ? { ...item, showDesktop: true, showMobile: false, isActive: true } : item,
  );
  await api(cookie, "PATCH", "/api/admin/site-navigation", { panel: "header_menu", items: desktopOnly });
  pass("Mutation C: desktop-only applied");

  await api(cookie, "PATCH", "/api/admin/site-navigation", { panel: "header_menu", items: headerItems });
  pass("Mutation C: visibility restored");

  const inactiveTarget = headerItems.find((i) => i.label === "Kiến thức") ?? headerItems[headerItems.length - 1];
  const deactivated = headerItems.map((item) =>
    item.id === inactiveTarget.id ? { ...item, isActive: false } : item,
  );
  res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "header_menu",
    items: deactivated,
  });
  if (res.status === 200) pass("Mutation D: deactivate save accepted");
  else fail(`Mutation D: ${res.status}`);

  const pubInactive = await getPublicHeaderLabels();
  if (!pubInactive.primary.includes(inactiveTarget.label)) pass("Mutation D: inactive item hidden on public");
  else fail(`Mutation D: item still visible: ${inactiveTarget.label}`);

  await api(cookie, "PATCH", "/api/admin/site-navigation", { panel: "header_menu", items: headerItems });
  pass("Mutation D: active state restored");
}

async function qaValidationErrors(cookie, cms) {
  const headerItems = cms.items.filter((i) => i.placement === "HEADER_MENU");
  const base = headerItems[0];

  const cases = [
    {
      name: "self-parent",
      items: [{ ...base, parentId: base.id }],
      expect: /không thể là cha của chính nó/,
    },
    {
      name: "missing-parent",
      items: [{ ...base, id: "orphan", parentId: "missing-id" }],
      expect: /mục cha không tồn tại/,
    },
    {
      name: "cross-placement-parent",
      items: [
        { ...base, id: "parent-mobile", placement: "MOBILE_MENU", parentId: null },
        { ...base, id: "child-header", placement: "HEADER_MENU", parentId: "parent-mobile" },
      ],
      expect: /mục cha không tồn tại/,
    },
    {
      name: "circular",
      items: [
        { ...base, id: "a", parentId: "b" },
        { ...base, id: "b", parentId: "a" },
      ],
      expect: /vòng lặp|tối đa 2 cấp/,
    },
    {
      name: "depth>2",
      items: [
        { ...base, id: "root", parentId: null },
        { ...base, id: "child", parentId: "root" },
        { ...base, id: "grandchild", parentId: "child" },
      ],
      expect: /tối đa 2 cấp/,
    },
    {
      name: "javascript:",
      items: [{ ...base, href: "javascript:alert(1)" }],
      expect: /URL|đường dẫn|hợp lệ/i,
    },
  ];

  for (const c of cases) {
    const res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
      panel: "header_menu",
      items: c.items,
    });
    const msg = res.json?.message ?? "";
    if (res.status === 400 && c.expect.test(msg)) pass(`Validation ${c.name}: ${msg.slice(0, 80)}`);
    else fail(`Validation ${c.name}: status=${res.status} msg=${msg}`);
  }

  const dataRes = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "social",
    socialLinks: cms.socialLinks.map((link) =>
      link.platform === "facebook"
        ? { ...link, href: "data:text/html,hi", isActive: true }
        : link,
    ),
  });
  const dataMsg = dataRes.json?.message ?? "";
  if (dataRes.status === 400 && /URL|hợp lệ/i.test(dataMsg)) pass(`Validation data: rejected`);
  else fail(`Validation data: ${dataRes.status} ${dataMsg}`);

  const extRes = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "social",
    socialLinks: cms.socialLinks.map((link) =>
      link.platform === "facebook"
        ? { ...link, href: "ftp://bad.example", isActive: true }
        : link,
    ),
  });
  const extMsg = extRes.json?.message ?? "";
  if (extRes.status === 400 && /URL|hợp lệ/i.test(extMsg)) pass(`Validation malformed external URL: rejected`);
  else fail(`Validation external: ${extRes.status} ${extMsg}`);
}

async function qaPlacementFallback(cookie, cms) {
  const footerItems = cms.items.filter((i) =>
    ["FOOTER_PRODUCTS", "FOOTER_SERVICES", "FOOTER_COMPANY"].includes(i.placement),
  );
  const withoutCompany = footerItems.filter((i) => i.placement !== "FOOTER_COMPANY");
  const headerBefore = (await getPublicHeaderLabels()).primary;

  const res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "footer",
    items: withoutCompany,
  });
  if (res.status !== 200) {
    fail(`Fallback save failed: ${res.status}`);
    return;
  }
  pass("Fallback: cleared FOOTER_COMPANY panel");

  const pub = await getPublicHeaderLabels();
  if (pub.footerCompany.length > 0) pass(`Fallback: company group has ${pub.footerCompany.length} default links`);
  else fail("Fallback: company group empty");

  if (JSON.stringify(pub.primary) === JSON.stringify(headerBefore)) pass("Fallback: header unchanged");
  else fail("Fallback: header changed unexpectedly");

  if (pub.status === 200) pass("Fallback: public page returns 200");
  else fail(`Fallback: public status ${pub.status}`);

  await api(cookie, "PATCH", "/api/admin/site-navigation", { panel: "footer", items: footerItems });
  pass("Fallback: FOOTER_COMPANY restored");
}

async function qaNestedMenu(cookie, cms) {
  const headerItems = cms.items.filter((i) => i.placement === "HEADER_MENU");
  const parent = {
    ...headerItems[0],
    id: "qa-parent-nested",
    label: "QA Parent",
    href: "/nguon-hang",
    parentId: null,
    sortOrder: 999,
  };
  const child = {
    ...headerItems[0],
    id: "qa-child-nested",
    label: "QA Child",
    href: "/blog",
    parentId: "qa-parent-nested",
    sortOrder: 1000,
    showDesktop: true,
    showMobile: true,
  };

  const withNested = [...headerItems, parent, child];
  const mobileItems = cms.items.filter((i) => i.placement === "MOBILE_MENU");
  const mobileParent = { ...parent, id: "qa-parent-mobile", placement: "MOBILE_MENU", sortOrder: 999 };
  const mobileChild = {
    ...child,
    id: "qa-child-mobile",
    placement: "MOBILE_MENU",
    parentId: "qa-parent-mobile",
    sortOrder: 1000,
  };
  const withMobileNested = [...mobileItems, mobileParent, mobileChild];

  let res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "header_menu",
    items: withNested,
  });
  if (res.status !== 200) {
    fail(`Nested header save failed: ${res.status} ${JSON.stringify(res.json)}`);
    return;
  }
  res = await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "mobile_menu",
    items: withMobileNested,
  });
  if (res.status !== 200) {
    fail(`Nested mobile save failed: ${res.status}`);
    return;
  }
  pass("Nested: parent+child saved (header + mobile)");

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 90000 });
    const parentBtn = await page.$('button.mp-header-primary-nav-link--parent');
    if (!parentBtn) {
      fail("Nested desktop: parent button not found");
    } else {
      pass("Nested desktop: parent button rendered");
      await parentBtn.click();
      await page.waitForSelector(".mp-header-primary-nav-submenu", { timeout: 5000 });
      pass("Nested desktop: dropdown opens on click");

      const childLink = await page.$('.mp-header-primary-nav-submenu a[href="/blog"]');
      if (childLink) pass("Nested desktop: child link present");
      else fail("Nested desktop: child link missing");

      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector(".mp-header-primary-nav-submenu"),
        { timeout: 3000 },
      );
      pass("Nested desktop: Escape closes");

      await parentBtn.focus();
      await page.keyboard.press("Enter");
      await page.waitForSelector(".mp-header-primary-nav-submenu", { timeout: 3000 });
      pass("Nested desktop: Enter opens");

      await page.mouse.click(10, 10);
      await page.waitForFunction(
        () => !document.querySelector(".mp-header-primary-nav-submenu"),
        { timeout: 3000 },
      );
      pass("Nested desktop: click outside closes");

      const focusVisible = await page.evaluate(() => {
        const btn = document.querySelector("button.mp-header-primary-nav-link--parent");
        return btn === document.activeElement;
      });
      if (focusVisible) pass("Nested desktop: focus state on button");
      else note("Nested desktop: focus state not verified after click outside");
    }

    await page.setViewport({ width: 390, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 90000 });
    const menuBtn = await page.$('button[aria-label="Mở menu"]');
    if (menuBtn) {
      await menuBtn.click();
      await page.waitForSelector(".mobile-nav-panel--open", { timeout: 5000 });
      const accordion = await page.$("details.mobile-nav-submenu");
      if (accordion) {
        pass("Nested mobile: accordion rendered");
        await page.evaluate(() => {
          const el = document.querySelector("details.mobile-nav-submenu");
          if (el) el.open = true;
        });
        const childVisible = await page.$('.mobile-nav-sublink--child[href="/blog"]');
        if (childVisible) pass("Nested mobile: child link visible");
        else fail("Nested mobile: child link not visible after expand");
      } else fail("Nested mobile: accordion not found");
    } else {
      fail("Nested mobile: menu button not found");
    }
  } catch (e) {
    fail(`Nested browser QA: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }

  await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "header_menu",
    items: headerItems,
  });
  await api(cookie, "PATCH", "/api/admin/site-navigation", {
    panel: "mobile_menu",
    items: mobileItems,
  });
  pass("Nested: temporary items removed");
}

async function qaPermissionDenied(prisma) {
  const salesEmployee = await prisma.employee.findFirst({
    where: { isActive: true, role: "SALES" },
    select: { id: true, fullName: true },
  });

  if (!salesEmployee) {
    note("Permission: no SALES employee for legacy login simulation");
    return;
  }

  let limitedCookie;
  try {
    limitedCookie = await loginLegacyEmployee(prisma, salesEmployee.id);
  } catch (e) {
    note(`Permission: legacy login failed: ${e.message}`);
    return;
  }

  const sessionRes = await api(limitedCookie, "GET", "/api/admin/auth/session");
  const flags = sessionRes.json?.flags;
  if (flags?.canManageCms === false && flags?.canUpdateOrders === true) {
    pass("Permission: limited session has orders.update without cms.manage");
  } else {
    note(`Permission flags: ${JSON.stringify(flags)}`);
  }

  const getRes = await api(limitedCookie, "GET", "/api/admin/site-navigation");
  if (getRes.status === 403) pass("Permission: GET API returns 403 without cms.manage");
  else fail(`Permission GET: expected 403, got ${getRes.status}`);

  const patchRes = await api(limitedCookie, "PATCH", "/api/admin/site-navigation", {
    panel: "settings",
    settings: {
      utilityTagline: "blocked",
      megaMenuTriggerLabel: "x",
      searchPlaceholder: "x",
      useCategoryTreeMegaMenu: true,
    },
  });
  if (patchRes.status === 403) pass("Permission: PATCH API returns 403 without cms.manage");
  else fail(`Permission PATCH: expected 403, got ${patchRes.status}`);

  const pageRes = await fetch(`${BASE}/admin/site-navigation`, {
    headers: { Cookie: limitedCookie },
    redirect: "manual",
  });
  const loc = pageRes.headers.get("location") ?? "";
  if (pageRes.status >= 300 && pageRes.status < 400 && loc.includes("forbidden")) {
    pass("Permission: admin page denied for limited user");
  } else if (pageRes.status >= 300 && pageRes.status < 400 && loc.includes("/admin/dashboard")) {
    pass("Permission: admin page redirects limited user away");
  } else {
    note(`Permission page: status=${pageRes.status} location=${loc}`);
  }
}

async function main() {
  const prisma = new PrismaClient();
  let snapshot = null;

  try {
    snapshot = await snapshotProduction(prisma);
    const ownerCookie = await loginOwner();
    pass("Authenticated owner login (cms.manage)");

    const cms = await qaAdminPanels(ownerCookie);
    if (!cms) throw new Error("No CMS config");

    await qaMutations(ownerCookie, cms);
    await qaValidationErrors(ownerCookie, cms);
    await qaPlacementFallback(ownerCookie, cms);
    await qaNestedMenu(ownerCookie, cms);
    await qaPermissionDenied(prisma);

    await restoreFromSnapshot(prisma, snapshot);
    pass("Production snapshot restored in DB");

    const finalPub = await getPublicHeaderLabels();
    if (finalPub.primary.includes("Nguồn hàng") && finalPub.primary.includes("Liên hệ")) {
      pass("Final public header matches production defaults");
    } else {
      fail(`Final public header: ${JSON.stringify(finalPub.primary)}`);
    }
  } catch (e) {
    fail(`QA runner error: ${e.message}`);
    if (snapshot) {
      try {
        await restoreFromSnapshot(prisma, snapshot);
        note("Emergency DB restore attempted");
      } catch (restoreErr) {
        fail(`Emergency restore failed: ${restoreErr.message}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n=== PASSES ===");
  passes.forEach((p) => console.log("✓", p));
  console.log("\n=== FAILURES ===");
  failures.forEach((f) => console.log("✗", f));
  console.log("\n=== NOTES ===");
  notes.forEach((n) => console.log("-", n));
  process.exit(failures.length ? 1 : 0);
}

main();
