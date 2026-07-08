"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, MessageCircle, FileText } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import { shouldShowMobileActionBar } from "@/lib/navConfig";
import { getZaloUrl } from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";

export default function MobileActionBar() {
  const pathname = usePathname();

  if (!shouldShowMobileActionBar(pathname)) {
    return null;
  }

  return (
    <div className="mobile-action-bar" role="navigation" aria-label="Liên hệ nhanh">
      <TrackedLink
        href="/lien-he"
        trackEvent="contact_quote"
        trackSource="mobile_action_bar"
        className="mobile-action-bar-btn mobile-action-bar-btn--quote"
      >
        <FileText size={20} strokeWidth={2} aria-hidden />
        Báo giá
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
      <TrackedLink
        href={CTA.primary.href}
        trackEvent="dealer_registration_click"
        trackSource="mobile_action_bar"
        className="mobile-action-bar-btn mobile-action-bar-btn--dealer"
      >
        <Handshake size={20} strokeWidth={2} aria-hidden />
        Đại lý
      </TrackedLink>
    </div>
  );
}
