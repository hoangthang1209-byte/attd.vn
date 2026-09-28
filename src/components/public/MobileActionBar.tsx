"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, FileText } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import { shouldShowMobileActionBar } from "@/lib/navConfig";
import { getZaloUrl } from "@/lib/companyInfo";
import type { PublicSiteNavigation } from "@/features/site-navigation/site-navigation.types";

type Props = {
  siteNavigation?: PublicSiteNavigation;
};

export default function MobileActionBar({ siteNavigation }: Props) {
  const pathname = usePathname();

  if (!shouldShowMobileActionBar(pathname)) {
    return null;
  }

  const quoteCta = siteNavigation?.ctas.MOBILE_ACTION_PRIMARY ?? {
    href: "/lien-he",
    label: "Báo giá",
    trackEvent: "contact_quote",
    openInNewTab: false,
  };
  return (
    <div className="mobile-action-bar" role="navigation" aria-label="Liên hệ nhanh">
      <TrackedLink
        href={quoteCta.href}
        trackEvent={(quoteCta.trackEvent as "contact_quote") ?? "contact_quote"}
        trackSource="mobile_action_bar"
        className="mobile-action-bar-btn mobile-action-bar-btn--quote"
      >
        <FileText size={20} strokeWidth={2} aria-hidden />
        {quoteCta.label}
      </TrackedLink>
      <TrackedLink
        href={getZaloUrl()}
        trackEvent="contact_zalo"
        trackSource="mobile_action_bar"
        external
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-action-bar-btn mobile-action-bar-btn--zalo"
      >
        <MessageCircle size={20} strokeWidth={2} aria-hidden />
        Zalo
      </TrackedLink>
    </div>
  );
}
