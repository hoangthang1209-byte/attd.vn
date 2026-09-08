import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Admin CMS header surface", () => {
  it("uses a fully opaque sticky page header without glass blur", () => {
    const css = read("src/components/admin/AdminShell.module.css");
    const headerStart = css.indexOf(".header {");
    const headerEnd = css.indexOf("\n}", headerStart);
    assert.ok(headerStart >= 0 && headerEnd > headerStart);
    const header = css.slice(headerStart, headerEnd);
    assert.match(header, /position:\s*sticky/);
    assert.match(header, /background:\s*#f8fafc/);
    assert.doesNotMatch(header, /backdrop-filter/);
    assert.doesNotMatch(header, /rgba\(\s*248\s*,\s*250\s*,\s*252\s*,\s*0\.\d+/);
    assert.match(header, /z-index:\s*10/);
  });

  it("defines --admin-header-height and applies it as scroll-padding on the real scroller", () => {
    const css = read("src/components/admin/AdminShell.module.css");
    const mainStart = css.indexOf(".main {");
    const mainEnd = css.indexOf("\n}", mainStart);
    const main = css.slice(mainStart, mainEnd);
    assert.match(main, /--admin-header-height:/);
    assert.match(main, /scroll-padding-top:\s*var\(--admin-header-height\)/);
    assert.match(main, /overflow-y:\s*auto/);

    const globals = read("src/app/globals.css");
    assert.match(globals, /html\.admin-cms\s*\{[\s\S]*?scroll-padding-top:\s*var\(--admin-header-height\)/);
    assert.match(globals, /--admin-header-height:\s*9rem/);
  });

  it("measures the live header height onto the CSS variable", () => {
    const shell = read("src/components/admin/AdminShell.tsx");
    assert.match(shell, /applyAdminHeaderHeight/);
    assert.match(shell, /ResizeObserver/);
    assert.match(shell, /setProperty\("--admin-header-height"/);
    assert.match(shell, /classList\.add\("admin-cms"\)/);
    assert.match(shell, /<h1 className=\{styles\.title\}>\{pageTitle\}<\/h1>/);
  });

  it("keeps Costing summary sticky below the measured header", () => {
    const globals = read("src/app/globals.css");
    assert.match(
      globals,
      /\.costing-summary-panel\s*\{[\s\S]*?top:\s*calc\(var\(--admin-header-height,\s*9rem\)\s*\+\s*16px\)/,
    );
  });

  it("does not raise the header above overlay layers", () => {
    const css = read("src/components/admin/AdminShell.module.css");
    const header = css.slice(css.indexOf(".header {"), css.indexOf("\n}", css.indexOf(".header {")));
    assert.match(header, /z-index:\s*10/);
    assert.doesNotMatch(header, /z-index:\s*[1-9]\d{2,}/);
    const globals = read("src/app/globals.css");
    assert.match(globals, /--admin-overlay-z:\s*4800/);
    assert.match(globals, /\[data-sonner-toaster\]\s*\{\s*z-index:\s*6000/);
  });
});
