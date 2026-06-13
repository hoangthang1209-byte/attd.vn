"use client";

import { usePathname } from "next/navigation";
import { Phone, MessageCircle, UserPlus } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import { CTA } from "@/lib/ctaConfig";
import {
  CONTACT_HOTLINE,
  CONTACT_HOTLINE_DISPLAY,
  CONTACT_ZALO_URL,
} from "@/lib/navConfig";

export default function FloatingContactWidget() {
  const pathname = usePathname();

  if (pathname.startsWith("/quan-tri")) {
    return null;
  }

  return (
    <div
      className="floating-contact"
      role="complementary"
      aria-label="Liên hệ nhanh"
    >
      <TrackedLink
        href={CTA.primary.href}
        trackEvent={CTA.primary.event}
        trackSource="FLOATING_WIDGET"
        className="floating-contact-btn floating-contact-btn--dealer"
      >
        <UserPlus size={20} aria-hidden />
        <span className="floating-contact-label">{CTA.primary.label}</span>
      </TrackedLink>

      <a
        href={`tel:${CONTACT_HOTLINE}`}
        className="floating-contact-btn floating-contact-btn--call"
        title={`Hotline ${CONTACT_HOTLINE_DISPLAY}`}
      >
        <Phone size={20} aria-hidden />
        <span className="floating-contact-label">Hotline</span>
      </a>

      <a
        href={CONTACT_ZALO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-contact-btn floating-contact-btn--zalo"
        title="Chat Zalo"
      >
        <MessageCircle size={20} aria-hidden />
        <span className="floating-contact-label">Zalo</span>
      </a>
    </div>
  );
}
