import {
  companyInfo,
  getHotlineDisplay,
  getHotlineTel,
  getZaloUrl,
  getEmail,
} from "@/lib/companyInfo";

type Props = {
  className?: string;
  compact?: boolean;
};

export default function PublicContactChannels({ className, compact = false }: Props) {
  const classes = ["public-contact-channels", compact ? "public-contact-channels--compact" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <p className="public-contact-channels__label">Liên hệ trực tiếp</p>
      <div className="public-contact-channels__items">
        <a href={`tel:${getHotlineTel()}`} className="public-contact-channels__item">
          <span className="public-contact-channels__item-title">Hotline</span>
          <span className="public-contact-channels__item-value">{getHotlineDisplay()}</span>
        </a>
        <a
          href={getZaloUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="public-contact-channels__item"
        >
          <span className="public-contact-channels__item-title">Zalo</span>
          <span className="public-contact-channels__item-value">Chat ngay</span>
        </a>
        <a href={`mailto:${getEmail()}`} className="public-contact-channels__item">
          <span className="public-contact-channels__item-title">Email</span>
          <span className="public-contact-channels__item-value">{getEmail()}</span>
        </a>
      </div>
      {!compact ? (
        <p className="public-contact-channels__hours">{companyInfo.workingHours}</p>
      ) : null}
    </div>
  );
}
