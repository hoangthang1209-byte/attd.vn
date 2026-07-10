import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SITE_NAVIGATION_SETTINGS } from "@/features/site-navigation/site-navigation-cms-defaults";
import {
  resolveFooterBottomBar,
  resolvePublicCopyrightText,
} from "@/features/site-navigation/public-footer-bottom-bar";
import type { SiteNavigationSettingsConfig } from "@/features/site-navigation/site-navigation.types";

describe("public footer bottom bar", () => {
  it("builds copyright with current year when enabled", () => {
    const settings: SiteNavigationSettingsConfig = {
      ...DEFAULT_SITE_NAVIGATION_SETTINGS,
      copyrightText: "ATTD.vn",
      showCurrentYear: true,
    };
    const copyright = resolvePublicCopyrightText(settings, "ATTD");
    assert.match(copyright, /^© \d{4} ATTD\.vn$/);
  });

  it("uses stored copyright text when current year is disabled", () => {
    const settings: SiteNavigationSettingsConfig = {
      ...DEFAULT_SITE_NAVIGATION_SETTINGS,
      copyrightText: "© 2026 ATTD.vn",
      showCurrentYear: false,
    };
    assert.equal(resolvePublicCopyrightText(settings, "ATTD"), "© 2026 ATTD.vn");
  });

  it("falls back to production defaults when settings are missing", () => {
    const resolved = resolveFooterBottomBar(undefined, "ATTD");
    assert.match(resolved.copyright, /^© \d{4} ATTD\.vn$/);
    assert.equal(resolved.showTaxCode, true);
    assert.equal(resolved.originText, "Designed & Manufactured in Vietnam");
    assert.deepEqual(resolved.legalLink, {
      label: "Chính sách đại lý",
      href: "/chinh-sach-dai-ly",
    });
  });

  it("hides legal link when disabled or invalid", () => {
    const disabled = resolveFooterBottomBar(
      { ...DEFAULT_SITE_NAVIGATION_SETTINGS, showLegalLink: false },
      "ATTD",
    );
    assert.equal(disabled.legalLink, null);

    const emptyHref = resolveFooterBottomBar(
      { ...DEFAULT_SITE_NAVIGATION_SETTINGS, legalLinkHref: "" },
      "ATTD",
    );
    assert.equal(emptyHref.legalLink, null);
  });

  it("allows external legal links", () => {
    const resolved = resolveFooterBottomBar(
      {
        ...DEFAULT_SITE_NAVIGATION_SETTINGS,
        legalLinkHref: "https://example.com/policy",
      },
      "ATTD",
    );
    assert.deepEqual(resolved.legalLink, {
      label: "Chính sách đại lý",
      href: "https://example.com/policy",
    });
  });
});
