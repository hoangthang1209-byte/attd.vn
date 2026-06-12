"use client";

import { useEffect } from "react";
import { initAttribution } from "@/lib/attribution";

/**
 * Invisible client component that initialises first-touch attribution
 * tracking once on mount. Renders nothing to the DOM.
 *
 * Reads UTM params from the URL, the first landing page, and the referrer,
 * then persists them in localStorage for later form submission.
 */
export default function AttributionTracker() {
  useEffect(() => {
    // Runs once on initial mount — no deps needed since we only want
    // first-touch and initAttribution is idempotent (won't overwrite).
    initAttribution();
  }, []);

  return null;
}
