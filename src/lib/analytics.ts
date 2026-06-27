/**
 * Google Analytics 4 event-tracking helpers.
 * Every function is fail-safe: if gtag is absent (GA not configured, JS
 * blocked, SSR context) the call is silently swallowed.
 */

// ── Global type augmentation for gtag ──────────────────────────────────────

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js" | "set",
      target: string | Date,
      params?: Record<string, string | number | boolean>
    ) => void;
    dataLayer?: unknown[];
  }
}

// Needed so the declare global above is treated as a module augmentation.
export {};

// ── Internal helper ─────────────────────────────────────────────────────────

function callGtag(
  command: "event" | "config" | "js" | "set",
  target: string | Date,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag(command, target, params);
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

// ── Public API ───────────────────────────────────────────────────────────────

/** Fire a manual page_view — called by GoogleAnalytics on pathname changes. */
export function trackPageView(url: string): void {
  if (!GA_ID) return;
  callGtag("config", GA_ID, { page_path: url });
}

/** Fired after a DealerLeadForm is successfully submitted. */
export function trackGenerateLead(source: string): void {
  callGtag("event", "generate_lead", { source });
}

/** Fired when a Zalo CTA is clicked. */
export function trackZaloClick(source: string): void {
  callGtag("event", "contact_zalo", { source });
}

/** Fired when a quote / contact CTA is clicked. */
export function trackQuoteClick(source: string): void {
  callGtag("event", "contact_quote", { source });
}

/** Fired when a dealer-registration CTA is clicked. */
export function trackDealerRegistration(source: string): void {
  callGtag("event", "dealer_registration_click", { source });
}

/** Fired when the homepage “Xem tất cả danh mục” CTA is clicked. */
export function trackHomepageViewAllCategoriesClick(params: {
  visible_category_count: number;
  homepage_category_limit: number;
  destination_path: string;
}): void {
  callGtag("event", "homepage_view_all_categories_click", params);
}
