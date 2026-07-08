"use client";

import { usePathname } from "next/navigation";
import { Phone, MessageCircle, UserPlus } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import BackToTopButton from "@/components/public/BackToTopButton";
import { CTA } from "@/lib/ctaConfig";
import { getHotlineTel, getHotlineDisplay, getZaloUrl } from "@/lib/companyInfo";

export default function FloatingContactWidget() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/quan-tri")) {
    return null;
  }

  return (
    <div
      className="floating-contact"
      role="complementary"
      aria-label="Liên hệ nhanh"
    >
      <BackToTopButton />

      <div className="floating-contact-actions">
        <TrackedLink
          href={CTA.primary.href}
          trackEvent={CTA.primary.event}
          trackSource="FLOATING_WIDGET"
          className="floating-contact-btn floating-contact-btn--dealer"
        >
          <UserPlus size={20} aria-hidden />
          <span className="floating-contact-label">{CTA.primary.label}</span>
        </TrackedLink>

        <TrackedAnchor
          href={`tel:${getHotlineTel()}`}
          trackEvent="contact_hotline"
          trackSource="floating_widget"
          className="floating-contact-btn floating-contact-btn--call"
          title={`Hotline ${getHotlineDisplay()}`}
        >
          <Phone size={20} aria-hidden />
          <span className="floating-contact-label">Hotline</span>
        </TrackedAnchor>

        <TrackedAnchor
          href={getZaloUrl()}
          trackEvent="contact_zalo"
          trackSource="floating_widget"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-contact-btn floating-contact-btn--zalo"
          title="Chat Zalo"
        >
          <MessageCircle size={20} aria-hidden />
          <span className="floating-contact-label">Zalo</span>
        </TrackedAnchor>
      </div>
    </div>
  );
}
