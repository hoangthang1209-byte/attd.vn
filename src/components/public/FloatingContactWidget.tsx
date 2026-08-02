"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Phone, MessageCircle, UserPlus } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";
import BackToTopButton from "@/components/public/BackToTopButton";
import { CTA } from "@/lib/ctaConfig";
import { getHotlineTel, getHotlineDisplay, getZaloUrl } from "@/lib/companyInfo";

/** Long-form reading pages hold the widget back until the reader is committed. */
const REVEAL_AFTER_PX = 480;

export default function FloatingContactWidget() {
  const pathname = usePathname();
  const deferred = /^\/blog\/[^/]+$/.test(pathname);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!deferred) return;

    function onScroll() {
      setRevealed(window.scrollY > REVEAL_AFTER_PX);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [deferred]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/quan-tri")) {
    return null;
  }

  return (
    <div
      className={`floating-contact${deferred ? " floating-contact--deferred" : ""}${
        deferred && revealed ? " is-revealed" : ""
      }`}
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
          aria-label={CTA.primary.label}
        >
          <UserPlus size={20} aria-hidden />
          <span className="floating-contact-label">{CTA.primary.label}</span>
        </TrackedLink>

        <TrackedAnchor
          href={`tel:${getHotlineTel()}`}
          trackEvent="contact_hotline"
          trackSource="floating_widget"
          className="floating-contact-btn floating-contact-btn--call"
          aria-label={`Gọi hotline ${getHotlineDisplay()}`}
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
          aria-label="Chat Zalo với ATTD"
          title="Chat Zalo"
        >
          <MessageCircle size={20} aria-hidden />
          <span className="floating-contact-label">Zalo</span>
        </TrackedAnchor>
      </div>
    </div>
  );
}
