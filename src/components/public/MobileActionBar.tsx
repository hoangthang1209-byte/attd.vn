"use client";

import { usePathname } from "next/navigation";
import { Phone, MessageCircle, UserPlus } from "lucide-react";
import { shouldShowMobileActionBar } from "@/lib/navConfig";
import { getHotlineTel, getZaloUrl } from "@/lib/companyInfo";
import { CTA } from "@/lib/ctaConfig";

export default function MobileActionBar() {
  const pathname = usePathname();

  if (!shouldShowMobileActionBar(pathname)) {
    return null;
  }

  return (
    <div className="mobile-action-bar" role="navigation" aria-label="Liên hệ nhanh">
      <a
        href={`tel:${getHotlineTel()}`}
        className="mobile-action-bar-btn mobile-action-bar-btn--call"
      >
        <Phone size={20} strokeWidth={2} aria-hidden />
        Gọi ngay
      </a>
      <a
        href={getZaloUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-action-bar-btn mobile-action-bar-btn--zalo"
      >
        <MessageCircle size={20} strokeWidth={2} aria-hidden />
        Zalo
      </a>
      <a
        href={CTA.primary.href}
        className="mobile-action-bar-btn mobile-action-bar-btn--dealer"
      >
        <UserPlus size={20} strokeWidth={2} aria-hidden />
        Đại lý
      </a>
    </div>
  );
}
