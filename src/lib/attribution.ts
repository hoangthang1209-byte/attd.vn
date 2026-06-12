/**
 * First-touch UTM & referrer attribution.
 *
 * Values are read from the URL query string and document.referrer on the
 * first page the visitor lands on, then persisted in localStorage.
 * Once stored they are NEVER overwritten (first-touch model).
 * Values are available until a form submission reads them.
 */

const STORAGE_KEY = "attd_attribution";
const MAX_LEN = 255;

export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
}

// ── Private helpers ──────────────────────────────────────────────────────────

function clip(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.trim().slice(0, MAX_LEN);
  return t || undefined;
}

function readStored(): AttributionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AttributionData;
  } catch {
    return {};
  }
}

function writeStored(data: AttributionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be blocked (private browsing, storage quota, etc.)
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise attribution on first page load.
 * Must be called once from a client component (e.g. AttributionTracker).
 * Safe to call on every render — values are only written if not already set.
 */
export function initAttribution(): void {
  if (typeof window === "undefined") return;

  const existing = readStored();
  const updated: AttributionData = { ...existing };

  const params = new URLSearchParams(window.location.search);

  // UTM parameters — only persist if not already captured
  if (!existing.utmSource) {
    const v = clip(params.get("utm_source"));
    if (v) updated.utmSource = v;
  }
  if (!existing.utmMedium) {
    const v = clip(params.get("utm_medium"));
    if (v) updated.utmMedium = v;
  }
  if (!existing.utmCampaign) {
    const v = clip(params.get("utm_campaign"));
    if (v) updated.utmCampaign = v;
  }
  if (!existing.utmTerm) {
    const v = clip(params.get("utm_term"));
    if (v) updated.utmTerm = v;
  }
  if (!existing.utmContent) {
    const v = clip(params.get("utm_content"));
    if (v) updated.utmContent = v;
  }

  // First landing page
  if (!existing.landingPage) {
    const lp = clip(window.location.pathname);
    if (lp) updated.landingPage = lp;
  }

  // Referrer — only capture if it's from a different domain
  if (!existing.referrer) {
    const ref = clip(document.referrer);
    if (ref) updated.referrer = ref;
  }

  writeStored(updated);
}

/**
 * Read the stored attribution data.
 * Returns an empty object when running on the server or when nothing is stored.
 */
export function getAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  return readStored();
}
