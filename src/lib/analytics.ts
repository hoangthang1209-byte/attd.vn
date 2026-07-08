/**
 * Google Analytics 4 public conversion tracking.
 * Fail-safe: no-ops when GA is not configured or gtag is unavailable.
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js" | "set",
      target: string | Date,
      params?: Record<string, string | number | boolean>,
    ) => void;
    dataLayer?: unknown[];
  }
}

export {};

export type PublicEventPayload = Record<string, string | number | boolean | undefined>;

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

function isAnalyticsReady(): boolean {
  if (!GA_ID) return false;
  if (typeof window === "undefined") return false;
  return typeof window.gtag === "function";
}

function callGtag(
  command: "event" | "config" | "js" | "set",
  target: string | Date,
  params?: Record<string, string | number | boolean>,
): void {
  if (!isAnalyticsReady()) return;
  window.gtag!(command, target, params);
}

function sanitizePayload(
  payload?: PublicEventPayload,
): Record<string, string | number | boolean> | undefined {
  if (!payload) return undefined;
  const entries = Object.entries(payload).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Generic public conversion event — safe no-op when analytics is not configured. */
export function trackPublicEvent(eventName: string, payload?: PublicEventPayload): void {
  callGtag("event", eventName, sanitizePayload(payload));
}

export function trackPageView(url: string): void {
  if (!GA_ID) return;
  callGtag("config", GA_ID, { page_path: url });
}

// ── CTA clicks ───────────────────────────────────────────────────────────────

export function trackQuoteClick(source: string, extra?: PublicEventPayload): void {
  trackPublicEvent("contact_quote", { source, ...extra });
}

export function trackWholesaleRequestClick(source: string, extra?: PublicEventPayload): void {
  trackPublicEvent("wholesale_request_click", { source, ...extra });
}

export function trackDealerRegistration(source: string, extra?: PublicEventPayload): void {
  trackPublicEvent("dealer_registration_click", { source, ...extra });
}

export function trackZaloClick(source: string, extra?: PublicEventPayload): void {
  trackPublicEvent("contact_zalo", { source, ...extra });
}

export function trackHotlineClick(source: string, extra?: PublicEventPayload): void {
  trackPublicEvent("contact_hotline", { source, ...extra });
}

export function trackEmailClick(source: string, extra?: PublicEventPayload): void {
  trackPublicEvent("contact_email", { source, ...extra });
}

export function trackViewCatalog(source: string, destinationPath: string): void {
  trackPublicEvent("view_catalog", { source, destination_path: destinationPath });
}

export function trackViewProduct(
  source: string,
  params: { product_id?: string; product_slug?: string; destination_path?: string },
): void {
  trackPublicEvent("view_product", { source, ...params });
}

// ── Forms ────────────────────────────────────────────────────────────────────

export function trackContactFormSubmitAttempt(source = "contact_form"): void {
  trackPublicEvent("contact_form_submit_attempt", { source });
}

export function trackContactFormSubmitSuccess(source = "contact_form"): void {
  trackPublicEvent("contact_form_submit_success", { source });
}

export function trackDealerFormSubmitAttempt(source: string): void {
  trackPublicEvent("dealer_form_submit_attempt", { source });
}

export function trackDealerFormSubmitSuccess(source: string): void {
  trackPublicEvent("dealer_form_submit_success", { source });
}

/** GA4 recommended event — kept for dealer lead conversions. */
export function trackGenerateLead(source: string): void {
  trackPublicEvent("generate_lead", { source });
  trackDealerFormSubmitSuccess(source);
}

export function trackPdpQuoteSubmitAttempt(params: {
  product_id: string;
  product_slug: string;
  source?: string;
}): void {
  trackPublicEvent("pdp_quote_submit_attempt", {
    source: params.source ?? "pdp_quote_dialog",
    product_id: params.product_id,
    product_slug: params.product_slug,
  });
}

export function trackPdpQuoteSubmitSuccess(params: {
  product_id: string;
  product_slug: string;
  source?: string;
}): void {
  trackPublicEvent("pdp_quote_submit_success", {
    source: params.source ?? "pdp_quote_dialog",
    product_id: params.product_id,
    product_slug: params.product_slug,
  });
}

// ── Search ───────────────────────────────────────────────────────────────────

export function trackSearchSubmitted(query: string, source: string): void {
  trackPublicEvent("search_submitted", { query, source });
}

export function trackSearchEmptyResult(query: string, source: string): void {
  trackPublicEvent("search_empty_result", { query, source });
}

export function trackSearchSuggestionClicked(params: {
  suggestion: string;
  query?: string;
  source: string;
}): void {
  trackPublicEvent("search_suggestion_clicked", {
    suggestion: params.suggestion,
    source: params.source,
    ...(params.query ? { query: params.query } : {}),
  });
}

// ── Product ──────────────────────────────────────────────────────────────────

export function trackPdpQuoteClicked(params: {
  product_id: string;
  product_slug: string;
  source: string;
}): void {
  trackPublicEvent("pdp_quote_clicked", {
    source: params.source,
    product_id: params.product_id,
    product_slug: params.product_slug,
  });
}

export function trackPdpOptionsChanged(params: {
  product_id: string;
  product_slug: string;
  option_summary: string;
}): void {
  trackPublicEvent("pdp_options_changed", {
    product_id: params.product_id,
    product_slug: params.product_slug,
    option_summary: params.option_summary,
  });
}

export function trackPdpMobileZaloClicked(productSlug: string): void {
  trackPublicEvent("pdp_mobile_zalo_clicked", {
    source: "pdp_mobile_bar",
    product_slug: productSlug,
  });
}

// ── Homepage ─────────────────────────────────────────────────────────────────

export function trackHomepageViewAllCategoriesClick(params: {
  visible_category_count: number;
  homepage_category_limit: number;
  destination_path: string;
}): void {
  trackPublicEvent("homepage_view_all_categories_click", params);
  trackViewCatalog("homepage_view_all_categories", params.destination_path);
}

// ── Link inference helper ────────────────────────────────────────────────────

export type InferredPublicCtaEvent =
  | "contact_quote"
  | "dealer_registration_click"
  | "wholesale_request_click"
  | "view_catalog"
  | "view_product";

export function resolvePublicCtaEvent(href: string): InferredPublicCtaEvent | null {
  const path = href.split("?")[0]?.split("#")[0] ?? "";
  if (path === "/lien-he") return "contact_quote";
  if (path === "/dai-ly") return "dealer_registration_click";
  if (path === "/nguon-hang" || path.startsWith("/nguon-hang-")) return "wholesale_request_click";
  if (path.startsWith("/san-pham/") && path !== "/san-pham") return "view_product";
  if (path === "/san-pham" || path === "/danh-muc-san-pham") return "view_catalog";
  return null;
}

export function trackInferredPublicLinkClick(href: string, source: string): void {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  const event = resolvePublicCtaEvent(href);
  switch (event) {
    case "contact_quote":
      trackQuoteClick(source);
      break;
    case "dealer_registration_click":
      trackDealerRegistration(source);
      break;
    case "wholesale_request_click":
      trackWholesaleRequestClick(source);
      break;
    case "view_catalog":
      trackViewCatalog(source, path);
      break;
    case "view_product":
      trackViewProduct(source, {
        product_slug: path.replace(/^\/san-pham\//, ""),
        destination_path: path,
      });
      break;
    default:
      break;
  }
}
