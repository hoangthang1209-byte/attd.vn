"use client";

import {
  companyInfo,
  getHotlineDisplay,
  getHotlineTel,
  getZaloUrl,
  getEmail,
} from "@/lib/companyInfo";
import TrackedAnchor from "@/components/analytics/TrackedAnchor";

type Props = {
  className?: string;
  compact?: boolean;
  source?: string;
};

export default function PublicContactChannels({
  className,
  compact = false,
  source = "public_contact_channels",
}: Props) {
  const classes = ["public-contact-channels", compact ? "public-contact-channels--compact" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <p className="public-contact-channels__label">Liên hệ trực tiếp</p>
      <div className="public-contact-channels__items">
        <TrackedAnchor
          href={`tel:${getHotlineTel()}`}
          trackEvent="contact_hotline"
          trackSource={source}
          className="public-contact-channels__item"
        >
          <span className="public-contact-channels__item-title">Hotline</span>
          <span className="public-contact-channels__item-value">{getHotlineDisplay()}</span>
        </TrackedAnchor>
        <TrackedAnchor
          href={getZaloUrl()}
          trackEvent="contact_zalo"
          trackSource={source}
          target="_blank"
          rel="noopener noreferrer"
          className="public-contact-channels__item"
        >
          <span className="public-contact-channels__item-title">Zalo</span>
          <span className="public-contact-channels__item-value">Chat ngay</span>
        </TrackedAnchor>
        <TrackedAnchor
          href={`mailto:${getEmail()}`}
          trackEvent="contact_email"
          trackSource={source}
          className="public-contact-channels__item"
        >
          <span className="public-contact-channels__item-title">Email</span>
          <span className="public-contact-channels__item-value">{getEmail()}</span>
        </TrackedAnchor>
      </div>
      {!compact ? (
        <p className="public-contact-channels__hours">{companyInfo.workingHours}</p>
      ) : null}
    </div>
  );
}
