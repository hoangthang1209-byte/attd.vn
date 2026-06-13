"use client";

import Link from "next/link";
import {
  trackZaloClick,
  trackQuoteClick,
  trackDealerRegistration,
} from "@/lib/analytics";

export type TrackedEvent =
  | "contact_zalo"
  | "contact_quote"
  | "dealer_registration_click";

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

/**
 * A drop-in replacement for `<Link>` / `<a>` that fires a GA4 event on click.
 * - Internal links (default): rendered as Next.js `<Link>` for prefetching.
 * - External links (`external` prop): rendered as `<a>`.
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
    }
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
    <Link
      href={href}
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
