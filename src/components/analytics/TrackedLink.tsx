"use client";

import Link from "next/link";
import {
  trackDealerRegistration,
  trackInferredPublicLinkClick,
  trackQuoteClick,
  trackWholesaleRequestClick,
  trackZaloClick,
  type InferredPublicCtaEvent,
} from "@/lib/analytics";

export type TrackedEvent =
  | "contact_zalo"
  | "contact_quote"
  | "dealer_registration_click"
  | "wholesale_request_click"
  | InferredPublicCtaEvent;

interface TrackedLinkProps {
  href: string;
  trackEvent: TrackedEvent;
  trackSource: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** Pass true for external URLs (e.g. Zalo). Renders <a> instead of <Link>. */
  external?: boolean;
  target?: string;
  rel?: string;
}

function fireTrackedEvent(trackEvent: TrackedEvent, trackSource: string, href: string): void {
  switch (trackEvent) {
    case "contact_zalo":
      trackZaloClick(trackSource);
      break;
    case "contact_quote":
      trackQuoteClick(trackSource);
      break;
    case "dealer_registration_click":
      trackDealerRegistration(trackSource);
      break;
    case "wholesale_request_click":
      trackWholesaleRequestClick(trackSource);
      break;
    case "view_catalog":
    case "view_product":
      trackInferredPublicLinkClick(href, trackSource);
      break;
    default:
      break;
  }
}

/**
 * A drop-in replacement for `<Link>` / `<a>` that fires a GA4 event on click.
 */
export default function TrackedLink({
  href,
  trackEvent,
  trackSource,
  children,
  external = false,
  className,
  style,
  onClick,
  target,
  rel,
}: TrackedLinkProps) {
  function handleClick(): void {
    fireTrackedEvent(trackEvent, trackSource, href);
    onClick?.();
  }

  if (external) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={className}
        style={style}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </Link>
  );
}
