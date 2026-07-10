import type { PublicNavLink } from "@/features/site-navigation/site-navigation.types";

export function flattenPublicNavLinks(
  links: PublicNavLink[],
): Array<{ href: string; label: string; openInNewTab?: boolean; trackEvent?: string | null }> {
  return links.map((link) => ({
    href: link.href,
    label: link.label,
    openInNewTab: link.openInNewTab,
    trackEvent: link.trackEvent,
  }));
}

export function publicNavLinkToNavLink(link: PublicNavLink) {
  return {
    href: link.href,
    label: link.label,
  };
}
