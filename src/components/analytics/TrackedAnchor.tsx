"use client";

import {
  trackEmailClick,
  trackHotlineClick,
  trackZaloClick,
} from "@/lib/analytics";

export type TrackedAnchorEvent = "contact_zalo" | "contact_hotline" | "contact_email";

type TrackedAnchorProps = {
  href: string;
  trackEvent: TrackedAnchorEvent;
  trackSource: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  title?: string;
  onClick?: () => void;
};

export default function TrackedAnchor({
  href,
  trackEvent,
  trackSource,
  children,
  className,
  style,
  target,
  rel,
  title,
  onClick,
}: TrackedAnchorProps) {
  function handleClick(): void {
    switch (trackEvent) {
      case "contact_zalo":
        trackZaloClick(trackSource);
        break;
      case "contact_hotline":
        trackHotlineClick(trackSource);
        break;
      case "contact_email":
        trackEmailClick(trackSource);
        break;
    }
    onClick?.();
  }

  return (
    <a
      href={href}
      className={className}
      style={style}
      target={target}
      rel={rel}
      title={title}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
