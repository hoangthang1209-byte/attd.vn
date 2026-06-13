"use client";

import { usePathname } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import {
  shouldShowMobileActionBar,
  CONTACT_HOTLINE,
  CONTACT_ZALO_URL,
} from "@/lib/navConfig";

export default function MobileActionBar() {
  const pathname = usePathname();

  if (!shouldShowMobileActionBar(pathname)) {
    return null;
  }

  return (
    <div className="mobile-action-bar" role="navigation" aria-label="Liên hệ nhanh">
      <a href={`tel:${CONTACT_HOTLINE}`} className="mobile-action-bar-btn mobile-action-bar-btn--call">
        <Phone size={18} aria-hidden />
        Gọi ngay
      </a>
      <a
        href={CONTACT_ZALO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-action-bar-btn mobile-action-bar-btn--zalo"
      >
        <MessageCircle size={18} aria-hidden />
        Zalo
      </a>
    </div>
  );
}
