import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type { WritingCtaPlan, WritingSectionPlan } from "@/features/writing-engine/writing-engine.types";

const KNOWN_DESTINATIONS = ["/lien-he", "/contact", "/bao-gia", "/quote", "/san-pham", "/products"];

export function planCta(
  pkg: ContentContextPackage,
  sections: WritingSectionPlan[],
  profile: WritingProfile
): WritingCtaPlan {
  const warnings: string[] = [];
  const ctaSection = sections.find((s) => s.type === "CTA") ?? sections[sections.length - 1];
  const briefCta = pkg.brief.cta;

  const text = briefCta?.text?.trim() || "Liên hệ tư vấn";
  const type = briefCta?.type?.trim() || "CONTACT";
  let destination: string | null = "/lien-he";

  if (briefCta?.text && !KNOWN_DESTINATIONS.some((d) => destination?.includes(d))) {
    destination = "/lien-he";
  }

  if (profile.qaThresholds.requireCta && !text) {
    warnings.push("Commercial content requires CTA");
  }

  const plan: WritingCtaPlan = {
    primary: {
      type,
      text,
      destination,
      sectionId: ctaSection?.id ?? sections[0]?.id ?? "cta",
    },
    secondary: null,
    rules: [...profile.ctaRules],
    warnings,
  };

  if (pkg.topic.funnelStage === "COMMERCIAL" || pkg.topic.searchIntent === "TRANSACTIONAL") {
    plan.rules.push("Transactional intent — primary CTA required");
  }

  return plan;
}
