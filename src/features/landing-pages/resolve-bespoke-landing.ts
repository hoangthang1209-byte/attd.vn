import { BESPOKE_LANDING_DEFAULTS } from "@/features/landing-pages/bespoke-defaults";
import { mergeBespokeLanding } from "@/features/landing-pages/landing-page-merge";
import { getPublishedLandingPage } from "@/features/landing-pages/services/landing-page.service";
import type { LandingPageSlug } from "@/features/landing-pages/types";

type BespokeSlug = keyof typeof BESPOKE_LANDING_DEFAULTS;

export async function resolveBespokeLanding(slug: BespokeSlug) {
  const defaults = BESPOKE_LANDING_DEFAULTS[slug];
  const cms = await getPublishedLandingPage(slug);
  return mergeBespokeLanding(defaults, cms);
}

export function isBespokeLandingSlug(slug: string): slug is BespokeSlug {
  return slug in BESPOKE_LANDING_DEFAULTS;
}

export type { LandingPageSlug };
